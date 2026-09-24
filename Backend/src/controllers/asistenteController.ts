// Backend/src/controllers/asistenteController.ts
// Asistente del centro de ayuda. No usa IA: detecta la intención de la pregunta
// (con tolerancia a faltas de ortografía) y responde con datos reales de la BD:
// catálogo, precios, existencias, promociones vigentes, zonas de entrega,
// métodos de pago y — si hay sesión — los pedidos, apartados y personalizaciones
// del propio cliente. Guarda un contexto corto para preguntas encadenadas
// ("¿y cuánto cuesta?", "¿hay en existencia?").

import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

interface ProductoCard { id: number; nombre: string; precio: number; precio_oferta: number | null; stock: number; imagen: string | null; personalizable: boolean; }
interface Accion { label: string; ruta: string; }
interface Contexto { tema?: string; productoIds?: number[]; }
interface Respuesta {
  texto: string;
  productos?: ProductoCard[];
  acciones?: Accion[];
  whatsapp?: boolean;
  sugerencias?: string[];
  contexto?: Contexto;
}

// ── Utilidades de texto ─────────────────────────────────────────────
const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9#$ ]/g, ' ').replace(/\s+/g, ' ').trim();

const STOP = new Set(['de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'que', 'y', 'o', 'a', 'en', 'con', 'por', 'para', 'me', 'mi', 'mis', 'tu', 'tus', 'su', 'se', 'es', 'hay', 'tienen', 'tienes', 'tiene', 'quiero', 'quisiera', 'busco', 'buscando', 'algo', 'algun', 'alguna', 'como', 'cual', 'cuales', 'donde', 'cuanto', 'cuanta', 'cuesta', 'cuestan', 'precio', 'precios', 'vale', 'valen', 'ver', 'muestrame', 'ensename', 'dame', 'favor', 'hola', 'buenas', 'buenos', 'dias', 'tardes', 'noches', 'porfa', 'pls', 'no', 'si', 'lo', 'le', 'les', 'del', 'al', 'mas', 'menos', 'menor', 'mayor', 'barato', 'baratos', 'barata', 'baratas', 'economico', 'economicos', 'caro', 'caros', 'pesos', 'mxn', 'venden', 'vendes', 'manejan', 'disponible', 'disponibles', 'este', 'esta', 'esto', 'ese', 'esa', 'eso', 'ustedes', 'puedo', 'puedes', 'pueden', 'necesito', 'saber', 'sobre']);

// Distancia de edición (para tolerar "pedio", "apatado", "personalisacion"...)
const lev = (a: string, b: string): number => {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
};

/** true si alguna palabra de la consulta coincide (prefijo o con 1-2 errores) con alguna raíz. */
const coincide = (tokens: string[], texto: string, raices: string[]) =>
  raices.some(r => {
    if (r.includes(' ')) return texto.includes(r);
    return tokens.some(t => t.startsWith(r) || (r.length >= 5 && t.length >= 4 && lev(t.slice(0, r.length + 1), r) <= (r.length >= 8 ? 2 : 1)));
  });

const money = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fecha = (d: string | Date | null) => d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const ESTADO_PEDIDO: Record<string, string> = {
  pendiente: 'Pendiente (esperando confirmación)', confirmado: 'Confirmado', en_preparacion: 'En preparación',
  enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado',
};
const ESTADO_PERS: Record<string, string> = {
  pendiente: 'en revisión', aprobada: 'aprobada — ya puedes comprarla', aprobado: 'aprobada — ya puedes comprarla',
  rechazada: 'rechazada', rechazado: 'rechazada',
};

// ── Intenciones ─────────────────────────────────────────────────────
const I = {
  saludo: ['hola', 'buenas', 'buen dia', 'que tal', 'hey'],
  gracias: ['gracias', 'grax', 'thank', 'excelente', 'perfecto', 'genial'],
  persona: ['persona', 'humano', 'asesor', 'agente', 'whatsapp', 'wats', 'wasap', 'hablar con', 'llamar', 'telefono', 'numero'],
  horario: ['horario', 'hora', 'abren', 'cierran', 'abierto', 'atienden'],
  ubicacion: ['ubicacion', 'direccion', 'sucursal', 'tienda fisica', 'donde estan', 'donde se ubican', 'mapa', 'local'],
  envio: ['envio', 'enviar', 'envian', 'domicilio', 'entrega', 'entregan', 'llegan', 'llega', 'mandan', 'paqueteria', 'combi', 'transport', 'flete', 'zona', 'zonas'],
  pago: ['pago', 'pagar', 'pagos', 'tarjeta', 'efectivo', 'transferencia', 'paypal', 'mercado pago', 'mercadopago', 'metodo', 'deposito', 'oxxo'],
  promo: ['promo', 'promocion', 'descuento', 'oferta', 'cupon', 'rebaja', 'barata'],
  apartado: ['apartado', 'apartar', 'aparto', 'abono', 'abonar', 'liquidar', 'saldo'],
  personaliz: ['personaliz', 'grabado', 'grabar', 'diseno', 'a medida', 'medida', 'nombre en'],
  pedido: ['pedido', 'orden', 'compra', 'compre', 'rastre', 'seguimiento', 'mi paquete', 'donde esta', 'cuando llega', 'folio', 'estatus', 'status', 'estado de'],
  mio: ['mi ', 'mis ', 'mio', 'mia', 'tengo', 'hice', 'realice', 'compre', 'aparte'],
  categorias: ['categoria', 'que venden', 'que manejan', 'que tienen', 'tipos de', 'catalogo'],
  nuevo: ['nuevo', 'novedad', 'reciente', 'llego'],
  destacado: ['destacado', 'recomienda', 'recomiendas', 'popular', 'mas vendido', 'favorito'],
  stock: ['stock', 'existencia', 'queda', 'quedan', 'agotado', 'hay disponible', 'tienen disponible'],
  precio: ['cuanto', 'precio', 'cuesta', 'vale', 'costo'],
  cancelar: ['cancelar', 'cancelo', 'devolucion', 'devolver', 'reembolso', 'cambio'],
  cuenta: ['contrasena', 'password', 'cuenta', 'registr', 'iniciar sesion', 'login', 'correo'],
};

const SUGERENCIAS_BASE = ['¿Cómo va mi pedido?', 'Anillos de menos de $500', 'Promociones vigentes', '¿Llegan a mi colonia?', 'Formas de pago'];

// ── Consultas ───────────────────────────────────────────────────────
const infoEmpresa = async () =>
  (await pool.query('SELECT horario, direccion, telefono, email, whatsapp FROM informacion_empresa WHERE id = 1')).rows[0] || {};

const clienteIdDe = async (userId?: number): Promise<number | null> => {
  if (!userId) return null;
  const r = await pool.query('SELECT id FROM clientes WHERE user_id = $1 LIMIT 1', [userId]);
  return r.rows[0]?.id ?? null;
};

const aCard = (p: any): ProductoCard => ({
  id: p.id, nombre: p.nombre, precio: Number(p.precio_venta), precio_oferta: p.precio_oferta ? Number(p.precio_oferta) : null,
  stock: Number(p.stock_actual), imagen: p.imagen_principal || null, personalizable: !!p.permite_personalizacion,
});

const SELECT_PROD = `SELECT p.id, p.nombre, p.precio_venta, p.precio_oferta, p.stock_actual, p.imagen_principal,
                            p.permite_personalizacion, p.precio_personalizacion
                     FROM productos p
                     LEFT JOIN categorias c ON c.id = p.categoria_id
                     WHERE p.activo = true`;

/** Extrae un rango de precio de frases como "menos de 500", "entre 300 y 800", "más de $1000". */
const rangoPrecio = (q: string): { min?: number; max?: number } | null => {
  const num = (s: string) => Number(s.replace(/[^0-9]/g, ''));
  let m = q.match(/entre \$?(\d[\d,]*) y \$?(\d[\d,]*)/);
  if (m) return { min: num(m[1]), max: num(m[2]) };
  m = q.match(/(menos de|menor a|menor de|hasta|maximo|max|debajo de|no mas de) \$?(\d[\d,]*)/);
  if (m) return { max: num(m[2]) };
  m = q.match(/(mas de|mayor a|mayor de|arriba de|desde|minimo) \$?(\d[\d,]*)/);
  if (m) return { min: num(m[2]) };
  return null;
};

const buscarProductos = async (tokens: string[], q: string, opts: { nuevo?: boolean; destacado?: boolean; barato?: boolean } = {}) => {
  const rango = rangoPrecio(q);
  const palabras = tokens.filter(t => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t)).slice(0, 5);
  const params: any[] = [];
  const conds: string[] = [];
  if (palabras.length) {
    // Cada palabra debe aparecer en nombre, categoría, material o descripción (singular/plural tolerado)
    for (const w of palabras) {
      const raiz = w.length > 4 ? w.replace(/(es|s)$/, '') : w;
      params.push(`%${raiz}%`);
      const i = params.length;
      conds.push(`(translate(lower(p.nombre),'áéíóúüñ','aeiouun') LIKE $${i} OR translate(lower(COALESCE(c.nombre,'')),'áéíóúüñ','aeiouun') LIKE $${i}
                   OR translate(lower(COALESCE(p.material_principal,'')),'áéíóúüñ','aeiouun') LIKE $${i} OR translate(lower(COALESCE(p.descripcion,'')),'áéíóúüñ','aeiouun') LIKE $${i})`);
    }
  }
  const precioExpr = 'COALESCE(p.precio_oferta, p.precio_venta)';
  if (rango?.min != null) { params.push(rango.min); conds.push(`${precioExpr} >= $${params.length}`); }
  if (rango?.max != null) { params.push(rango.max); conds.push(`${precioExpr} <= $${params.length}`); }
  if (opts.nuevo) conds.push('p.es_nuevo = true');
  if (opts.destacado) conds.push('p.es_destacado = true');
  if (!palabras.length && !rango && !opts.nuevo && !opts.destacado && !opts.barato) return null;

  const orden = opts.barato ? `${precioExpr} ASC` : opts.nuevo ? 'p.fecha_creacion DESC' : 'p.es_destacado DESC, p.stock_actual > 0 DESC, p.fecha_creacion DESC';
  const sql = `${SELECT_PROD} ${conds.length ? 'AND ' + conds.join(' AND ') : ''} ORDER BY ${orden} LIMIT 4`;
  const r = await pool.query(sql, params);
  return { productos: r.rows, rango, palabras };
};

// ── Controlador ─────────────────────────────────────────────────────
export const asistenteController = {
  preguntar: async (req: AuthRequest, res: Response) => {
    try {
      const mensaje = String(req.body?.mensaje || '').slice(0, 300);
      const ctx: Contexto = req.body?.contexto || {};
      if (!mensaje.trim()) return res.status(400).json({ success: false, message: 'Mensaje vacío' });

      const q = normalizar(mensaje);
      const tokens = q.split(' ').filter(Boolean);
      const es = (k: keyof typeof I) => coincide(tokens, ` ${q} `, I[k]);
      const userId: number | undefined = req.user?.userId ?? req.user?.id;
      const logeado = !!userId;

      const resp = await responder({ q, tokens, es, ctx, userId, logeado });
      res.json({ success: true, data: resp });
    } catch (error: any) {
      console.error('Error en asistente:', error);
      res.status(500).json({ success: false, message: 'Error del asistente' });
    }
  },
};

interface Entrada {
  q: string; tokens: string[]; es: (k: keyof typeof I) => boolean;
  ctx: Contexto; userId?: number; logeado: boolean;
}

const pedirSesion = (que: string): Respuesta => ({
  texto: `Para consultar ${que} necesitas iniciar sesión. Una vez dentro, pregúntame de nuevo y te digo el estado exacto.`,
  acciones: [{ label: 'Iniciar sesión', ruta: '/login' }],
});

async function responder({ q, tokens, es, ctx, userId, logeado }: Entrada): Promise<Respuesta> {
  const folio = q.match(/#?\b(\d{1,7})\b/)?.[1];

  // 1) Preguntas encadenadas sobre los productos mostrados antes
  if (ctx.productoIds?.length && tokens.length <= 6 && (es('precio') || es('stock') || es('personaliz'))
      && !es('pedido') && !es('apartado')) {
    const r = await pool.query(`${SELECT_PROD} AND p.id = ANY($1::int[])`, [ctx.productoIds]);
    if (r.rows.length) {
      const lineas = r.rows.map((p: any) => {
        const precio = p.precio_oferta ? `${money(p.precio_oferta)} (antes ${money(p.precio_venta)})` : money(p.precio_venta);
        const stock = p.stock_actual > 0 ? `${p.stock_actual} en existencia` : 'agotado por ahora';
        const pers = p.permite_personalizacion ? ` · personalizable (+${money(p.precio_personalizacion || 0)})` : '';
        return `• ${p.nombre}: ${precio}, ${stock}${pers}`;
      });
      return { texto: `Esto es lo que tengo de esas piezas:\n${lineas.join('\n')}`, productos: r.rows.map(aCard), contexto: { tema: 'productos', productoIds: ctx.productoIds } };
    }
  }

  // 2) Datos personales del cliente
  const hablaDeLoSuyo = es('mio') || !!folio;
  if (es('personaliz') && (hablaDeLoSuyo || q.includes('aprob') || q.includes('solicitud'))) {
    if (!logeado) return pedirSesion('tus personalizaciones');
    const cid = await clienteIdDe(userId);
    const r = cid ? await pool.query(
      `SELECT sp.id, sp.estado, sp.motivo_rechazo, sp.utilizada, sp.fecha_creacion, p.nombre
       FROM solicitudes_personalizacion sp JOIN productos p ON p.id = sp.producto_id
       WHERE sp.cliente_id = $1 ORDER BY sp.fecha_creacion DESC LIMIT 3`, [cid]) : { rows: [] as any[] };
    if (!r.rows.length) return { texto: 'Aún no tienes solicitudes de personalización. Busca productos con la etiqueta "✦ Personalizable" y elige "Solicitar personalización".', acciones: [{ label: 'Ver catálogo', ruta: '/catalogo' }] };
    const lineas = r.rows.map((s: any) => `• ${s.nombre} (${fecha(s.fecha_creacion)}): ${s.utilizada ? 'ya usada en una compra' : ESTADO_PERS[s.estado] || s.estado}${s.motivo_rechazo ? ` — motivo: ${s.motivo_rechazo}` : ''}`);
    return { texto: `Tus solicitudes más recientes:\n${lineas.join('\n')}`, acciones: [{ label: 'Mis personalizaciones', ruta: '/mis-personalizaciones' }], contexto: { tema: 'personalizacion' } };
  }

  if (es('apartado') && (hablaDeLoSuyo || q.includes('saldo') || q.includes('cuanto debo') || q.includes('falta'))) {
    if (!logeado) return pedirSesion('tus apartados');
    const cid = await clienteIdDe(userId);
    const r = cid ? await pool.query(
      `SELECT a.folio, a.estado, a.monto_total, a.monto_pagado, a.saldo_pendiente, a.fecha_limite_liquidacion,
              (SELECT string_agg(dv.producto_nombre, ', ') FROM detalle_ventas dv WHERE dv.venta_id = a.venta_id) productos
       FROM apartados a WHERE a.cliente_id = $1 AND COALESCE(a.archivado,false) = false
       ORDER BY (a.estado IN ('liquidado','cancelado')), a.fecha_apartado DESC LIMIT 3`, [cid]) : { rows: [] as any[] };
    if (!r.rows.length) return { texto: 'No tienes apartados activos. Puedes apartar una pieza desde su ficha con el botón "Apartar".', acciones: [{ label: 'Ver catálogo', ruta: '/catalogo' }] };
    const lineas = r.rows.map((a: any) => a.estado === 'liquidado' || a.estado === 'cancelado'
      ? `• ${a.folio} (${a.productos || 'pieza'}): ${a.estado}`
      : `• ${a.folio} (${a.productos || 'pieza'}): pagado ${money(a.monto_pagado)} de ${money(a.monto_total)}, te falta ${money(a.saldo_pendiente)}. Fecha límite: ${fecha(a.fecha_limite_liquidacion)}.`);
    return { texto: `Tus apartados:\n${lineas.join('\n')}`, acciones: [{ label: 'Mis apartados', ruta: '/mis-apartados' }], contexto: { tema: 'apartado' } };
  }

  if (es('pedido') && (hablaDeLoSuyo || q.includes('como va') || q.includes('ya llego') || q.includes('cuando'))) {
    if (!logeado) return pedirSesion('tus pedidos');
    const cid = await clienteIdDe(userId);
    const params: any[] = [cid];
    let filtro = '';
    if (folio) { params.push(folio); filtro = `AND (v.id::text = $2 OR v.folio ILIKE '%' || $2)`; }
    const r = cid ? await pool.query(
      `SELECT v.id, v.folio, v.estado, v.total, v.tipo_entrega, v.fecha_creacion, v.fecha_estimada_entrega,
              u.nombre AS trabajador,
              (SELECT string_agg(dv.producto_nombre, ', ') FROM detalle_ventas dv WHERE dv.venta_id = v.id) productos
       FROM ventas v LEFT JOIN usuarios u ON u.id = v.trabajador_id
       WHERE v.cliente_id = $1 ${filtro}
         AND v.id NOT IN (SELECT venta_id FROM apartados WHERE venta_id IS NOT NULL AND estado NOT IN ('cancelado','liquidado'))
       ORDER BY v.fecha_creacion DESC LIMIT 3`, params) : { rows: [] as any[] };
    if (!r.rows.length) return folio
      ? { texto: `No encontré un pedido tuyo con el número ${folio}. Revisa el folio en "Mis pedidos".`, acciones: [{ label: 'Mis pedidos', ruta: '/pedidos' }] }
      : { texto: 'Todavía no tienes pedidos. Cuando compres algo, aquí te digo cómo va.', acciones: [{ label: 'Ver catálogo', ruta: '/catalogo' }] };
    const lineas = r.rows.map((v: any) => {
      const partes = [`• Pedido ${v.folio || '#' + v.id} (${fecha(v.fecha_creacion)}) — ${ESTADO_PEDIDO[v.estado] || v.estado}`,
        `  ${v.productos || ''} · total ${money(v.total)} · ${v.tipo_entrega === 'domicilio' ? 'envío a domicilio' : 'recoger en tienda'}`];
      if (v.trabajador && v.estado !== 'pendiente') partes.push(`  Lo atiende: ${v.trabajador}`);
      if (v.fecha_estimada_entrega && !['entregado', 'cancelado'].includes(v.estado)) partes.push(`  Entrega estimada: ${fecha(v.fecha_estimada_entrega)}`);
      return partes.join('\n');
    });
    return { texto: `${folio ? 'Esto encontré' : 'Tus pedidos más recientes'}:\n${lineas.join('\n')}`, acciones: [{ label: 'Mis pedidos', ruta: '/pedidos' }], contexto: { tema: 'pedido' } };
  }

  // 3) Información del negocio
  if (es('gracias') && tokens.length <= 5) return { texto: '¡Con gusto! Si necesitas algo más, aquí estoy 💎', sugerencias: SUGERENCIAS_BASE.slice(0, 3) };

  if (es('persona')) {
    const info = await infoEmpresa();
    return info.whatsapp
      ? { texto: 'Con gusto te comunico con una persona de nuestro equipo por WhatsApp.', whatsapp: true }
      : { texto: `Por ahora el WhatsApp no está disponible.${info.telefono ? ` Puedes llamarnos al ${info.telefono}.` : ''}` };
  }

  if (es('horario')) {
    const info = await infoEmpresa();
    return { texto: info.horario ? `Nuestro horario de atención es:\n${info.horario}` : 'El horario aún no está publicado; escríbenos por WhatsApp y te confirmamos.', whatsapp: !info.horario };
  }

  if (es('ubicacion') && !es('envio')) {
    const info = await infoEmpresa();
    return { texto: `${info.direccion ? `Estamos en: ${info.direccion}.` : 'Aún no tenemos la dirección publicada.'}${info.horario ? `\nHorario: ${info.horario}` : ''}`, acciones: [{ label: 'Ver mapa', ruta: logeado ? '/ubicacion' : '/ubicacion-publica' }] };
  }

  if (es('envio')) {
    const zonas = (await pool.query('SELECT nombre FROM zonas_entrega WHERE activo = true ORDER BY orden, nombre')).rows.map((z: any) => z.nombre as string);
    // "¿llegan a Huejutla?" → busca el lugar mencionado
    const lugar = tokens.filter(t => t.length >= 4 && !STOP.has(t) && !I.envio.some(k => t.startsWith(k.split(' ')[0])));
    const match = lugar.length ? zonas.filter(z => lugar.some(l => normalizar(z).includes(l) || normalizar(z).split(' ').some(w => lev(w, l) <= 1))) : [];
    const base = 'La entrega a domicilio se hace a través de terceros (transportistas locales, combis y similares); el costo de envío se muestra al finalizar la compra. También puedes recoger en sucursal sin costo.';
    if (match.length) return { texto: `¡Sí! Entregamos en ${match.join(', ')}.\n${base}` };
    if (lugar.length && zonas.length) return { texto: `No encontré "${lugar.join(' ')}" en nuestras zonas de entrega. Por ahora llegamos a: ${zonas.join(', ')}.\nSi estás cerca, escríbenos por WhatsApp y lo revisamos.`, whatsapp: true };
    return { texto: `${zonas.length ? `Entregamos en: ${zonas.join(', ')}.\n` : ''}${base}` };
  }

  if (es('pago')) {
    const m = (await pool.query('SELECT nombre, codigo, instrucciones_cliente FROM metodos_pago WHERE activo = true ORDER BY orden, id')).rows;
    const lista = m.length ? m.map((x: any) => `• ${x.nombre}${x.codigo === 'efectivo' ? ' (solo al recoger en tienda)' : ''}`).join('\n') : '• Consulta los métodos al finalizar tu compra';
    return { texto: `Aceptamos:\n${lista}\nPrimero eliges si lo recoges en sucursal o lo enviamos a domicilio, y después se muestran los métodos que aplican.` };
  }

  if (es('promo')) {
    const r = await pool.query(
      `SELECT nombre, tipo::text tipo, valor_descuento, codigo_cupon, fecha_fin, monto_minimo_compra
       FROM promociones WHERE activo = true AND fecha_inicio <= NOW() AND fecha_fin >= NOW()
       ORDER BY fecha_fin ASC LIMIT 5`);
    if (!r.rows.length) return { texto: 'En este momento no hay promociones vigentes. Te avisamos en cuanto salga una nueva 💎', acciones: [{ label: 'Ver catálogo', ruta: logeado ? '/catalogo' : '/catalogo-publico' }] };
    const lineas = r.rows.map((p: any) => {
      const desc = p.tipo.includes('porcentaje') ? `${Number(p.valor_descuento)}% de descuento` : p.valor_descuento ? `${money(p.valor_descuento)} de descuento` : p.tipo;
      return `• ${p.nombre}: ${desc}${p.codigo_cupon ? ` con el cupón ${p.codigo_cupon}` : ''}${Number(p.monto_minimo_compra) > 0 ? ` (compra mínima ${money(p.monto_minimo_compra)})` : ''} — vigente hasta el ${fecha(p.fecha_fin)}`;
    });
    return { texto: `Promociones vigentes:\n${lineas.join('\n')}` };
  }

  if (es('cancelar')) {
    return { texto: 'Un pedido se puede cancelar mientras siga en estado "Pendiente", desde "Mis pedidos". Para cambios o devoluciones de un pedido ya confirmado, escríbenos por WhatsApp con tu número de pedido.', whatsapp: true, acciones: logeado ? [{ label: 'Mis pedidos', ruta: '/pedidos' }] : undefined };
  }

  if (es('cuenta') && !es('pedido')) {
    return logeado
      ? { texto: 'Tus datos, foto, teléfono y contraseña los cambias desde "Mi perfil".', acciones: [{ label: 'Mi perfil', ruta: '/perfil' }] }
      : { texto: 'Puedes crear tu cuenta gratis con tu correo. Si olvidaste tu contraseña, usa "¿Olvidaste tu contraseña?" en la pantalla de acceso.', acciones: [{ label: 'Crear cuenta', ruta: '/registro' }, { label: 'Iniciar sesión', ruta: '/login' }] };
  }

  if (es('apartado')) {
    return { texto: 'Puedes apartar una pieza pagando un anticipo y liquidarla en abonos antes de la fecha límite. Desde la ficha del producto eliges "Apartar"; el seguimiento y los comprobantes se ven en "Mis apartados".' + (logeado ? '' : ' Necesitas iniciar sesión.'), acciones: [{ label: logeado ? 'Mis apartados' : 'Iniciar sesión', ruta: logeado ? '/mis-apartados' : '/login' }] };
  }

  if (es('personaliz')) {
    const r = await pool.query(`${SELECT_PROD} AND p.permite_personalizacion = true ORDER BY p.es_destacado DESC, p.fecha_creacion DESC LIMIT 4`);
    return {
      texto: 'Los productos con la etiqueta "✦ Personalizable" se pueden adaptar a tu gusto. Desde su ficha eliges "Solicitar personalización", nos das los detalles y una imagen de referencia; primero la revisamos y te avisamos cuando puedas comprarla. El costo de personalización se suma al precio.' + (r.rows.length ? '\nAlgunas piezas personalizables:' : ''),
      productos: r.rows.map(aCard), contexto: { tema: 'productos', productoIds: r.rows.map((p: any) => p.id) },
      acciones: logeado ? [{ label: 'Mis personalizaciones', ruta: '/mis-personalizaciones' }] : undefined,
    };
  }

  if (es('pedido')) {
    return logeado
      ? { texto: 'Dime el número de tu pedido (por ejemplo "pedido 45") o pregúntame "¿cómo va mi pedido?" y te digo su estado.', sugerencias: ['¿Cómo va mi pedido?'] }
      : pedirSesion('el estado de un pedido');
  }

  if (es('categorias') && !rangoPrecio(q)) {
    const c = (await pool.query(
      `SELECT c.nombre, COUNT(p.id) n FROM categorias c JOIN productos p ON p.categoria_id = c.id AND p.activo = true
       WHERE c.activo = true GROUP BY c.nombre ORDER BY n DESC LIMIT 10`)).rows;
    if (c.length) return { texto: `Manejamos estas categorías:\n${c.map((x: any) => `• ${x.nombre} (${x.n})`).join('\n')}\nPregúntame por cualquiera, por ejemplo "aretes de plata".`, sugerencias: c.slice(0, 3).map((x: any) => `Ver ${x.nombre.toLowerCase()}`) };
  }

  // 4) Búsqueda en catálogo (productos, precios, existencias)
  const barato = tokens.some(t => ['barato', 'baratos', 'barata', 'baratas', 'economico', 'economicos', 'economica'].includes(t));
  const busq = await buscarProductos(tokens.map(t => t.replace(/^ver$/, '')), q, { nuevo: es('nuevo'), destacado: es('destacado'), barato });
  if (busq) {
    if (busq.productos.length) {
      const rangoTxt = busq.rango ? (busq.rango.min != null && busq.rango.max != null ? ` entre ${money(busq.rango.min)} y ${money(busq.rango.max)}` : busq.rango.max != null ? ` de hasta ${money(busq.rango.max)}` : ` desde ${money(busq.rango.min!)}`) : '';
      return {
        texto: `Encontré estas piezas${rangoTxt}. Pregúntame "¿cuánto cuestan?" o "¿hay en existencia?" si quieres el detalle:`,
        productos: busq.productos.map(aCard),
        contexto: { tema: 'productos', productoIds: busq.productos.map((p: any) => p.id) },
        acciones: [{ label: 'Ver catálogo completo', ruta: logeado ? '/catalogo' : '/catalogo-publico' }],
      };
    }
    if (busq.palabras.length || busq.rango) {
      // No hubo resultados con esos términos: ¿coinciden con una pregunta frecuente?
      const faq = await buscarFaq(tokens);
      if (faq) return { texto: faq };
      return {
        texto: `No encontré piezas${busq.palabras.length ? ` de "${busq.palabras.join(' ')}"` : ''}${busq.rango ? ' en ese rango de precio' : ''}. Puedes revisar el catálogo o preguntarle a una persona si podemos conseguirla.`,
        whatsapp: true, acciones: [{ label: 'Ver catálogo', ruta: logeado ? '/catalogo' : '/catalogo-publico' }],
      };
    }
  }

  // 5) Preguntas frecuentes que administra el negocio
  const faq = await buscarFaq(tokens);
  if (faq) return { texto: faq };

  if (es('saludo')) return { texto: '¡Hola! Soy el asistente de Joyería Diana Laura 💎 Puedo buscar piezas por tipo o precio, decirte las promociones vigentes, las zonas de entrega' + (logeado ? ' y cómo van tus pedidos, apartados o personalizaciones.' : '. Si inicias sesión, también te digo cómo van tus pedidos.'), sugerencias: SUGERENCIAS_BASE };

  return {
    texto: 'No estoy seguro de haber entendido. Prueba con algo como estas preguntas, o te comunico con una persona:',
    sugerencias: SUGERENCIAS_BASE, whatsapp: true,
  };
}

async function buscarFaq(tokens: string[]): Promise<string | null> {
  const utiles = tokens.filter(t => t.length > 3 && !STOP.has(t));
  if (!utiles.length) return null;
  const faqs = (await pool.query('SELECT pregunta, respuesta FROM faqs WHERE activa = true')).rows;
  let mejor: any = null; let puntos = 0;
  for (const f of faqs) {
    const base = normalizar(`${f.pregunta} ${f.pregunta} ${f.respuesta}`).split(' ');
    const p = utiles.filter(t => base.some(w => w.startsWith(t.slice(0, 5)) || (t.length >= 5 && lev(w, t) <= 1))).length;
    if (p > puntos) { puntos = p; mejor = f; }
  }
  return mejor && puntos >= Math.min(2, utiles.length) ? mejor.respuesta : null;
}
