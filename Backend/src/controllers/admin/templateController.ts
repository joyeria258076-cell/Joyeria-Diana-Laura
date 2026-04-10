// Backend/src/controllers/admin/templateController.ts
import { Response } from 'express';
import ExcelJS from 'exceljs';
import pool from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';

// ─────────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────────
interface ColumnaConfig {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: string | number | boolean;
  width?: number;
}

interface TemplateConfig {
  label: string;
  icon: string;
  columnas: ColumnaConfig[];
  relaciones?: { [key: string]: string };
}

// ─────────────────────────────────────────────
//  PALETA DE COLORES
// ─────────────────────────────────────────────
const C = {
  BRAND_DARK:    'FF1A1A2E',
  BRAND_MID:     'FF16213E',
  BRAND_ACCENT:  'FF0F3460',
  ROSA:          'FFECB2C3',
  ROSA_SUAVE:    'FFFFF0F3',
  ROSA_MED:      'FFF7C5D3',
  REQ_DARK:      'FF1B4332',
  REQ_LIGHT:     'FFD6F5E3',
  OPT_DARK:      'FF7D6608',
  OPT_LIGHT:     'FFFFF8DC',
  INFO_BG:       'FFE8F4FD',
  INFO_FG:       'FF1A5276',
  EX_BG:         'FFFFF9C4',
  WHITE:         'FFFFFFFF',
  GRAY_LIGHT:    'FFF5F5F5',
  GRAY_MED:      'FFD0D0D0',
  TEXT_DARK:     'FF1A1A1A',
  TEXT_MUTED:    'FF666666',
  ROW_A:         'FFFFFFFF',
  ROW_B:         'FFFFF8FB',
} as const;

// ============================================
// CONFIGURACIÓN DE PLANTILLAS - COMPLETA
// ============================================
const TEMPLATE_CONFIG: { [key: string]: TemplateConfig } = {

  // ── PRODUCTOS ──────────────────────────────
  productos: {
    label: 'Productos',
    icon: '💎',
    columnas: [
      { name: 'nombre', type: 'texto', required: true, width: 24, description: 'Nombre del producto', example: 'Anillo de Oro 18k' },
      { name: 'descripcion', type: 'texto', required: false, width: 32, description: 'Descripción detallada', example: 'Anillo clásico con diseño elegante' },
      { name: 'categoria_id', type: 'número', required: true, width: 16, description: 'ID de la categoría', example: 1 },
      { name: 'precio_compra', type: 'decimal', required: true, width: 16, description: 'Precio de compra', example: 2500.00 },
      { name: 'precio_oferta', type: 'decimal', required: false, width: 16, description: 'Precio de oferta', example: 2000.00 },
      { name: 'stock_actual', type: 'número', required: false, width: 14, description: 'Stock actual', example: 10 },
      { name: 'proveedor_id', type: 'número', required: false, width: 16, description: 'ID del proveedor', example: 1 },
      { name: 'material_principal', type: 'texto', required: false, width: 20, description: 'Material principal', example: 'Oro' },
      { name: 'peso_gramos', type: 'decimal', required: false, width: 14, description: 'Peso en gramos', example: 5.5 },
      { name: 'es_nuevo', type: 'booleano', required: false, width: 12, description: '¿Producto nuevo?', example: 'TRUE' },
      { name: 'es_destacado', type: 'booleano', required: false, width: 14, description: '¿Destacado?', example: 'FALSE' },
      { name: 'activo', type: 'booleano', required: false, width: 12, description: '¿Activo?', example: 'TRUE' },
    ],
    relaciones: {
      categorias: 'SELECT id, nombre FROM categorias WHERE activo = true ORDER BY nombre',
      proveedores: 'SELECT id, nombre FROM proveedores WHERE activo = true ORDER BY nombre',
    },
  },

  // ── PROVEEDORES ────────────────────────────
  proveedores: {
    label: 'Proveedores',
    icon: '🏭',
    columnas: [
      { name: 'nombre', type: 'texto', required: true, width: 28, description: 'Nombre del proveedor', example: 'Joyas López S.A.' },
      { name: 'razon_social', type: 'texto', required: false, width: 32, description: 'Razón social', example: 'Joyas López, S.A. de C.V.' },
      { name: 'rfc', type: 'texto', required: false, width: 16, description: 'RFC', example: 'JLS123456XYZ' },
      { name: 'direccion', type: 'texto', required: false, width: 36, description: 'Dirección', example: 'Av. Principal 123' },
      { name: 'telefono', type: 'texto', required: false, width: 16, description: 'Teléfono', example: '55 1234 5678' },
      { name: 'email', type: 'texto', required: false, width: 28, description: 'Email', example: 'contacto@proveedor.com' },
      { name: 'persona_contacto', type: 'texto', required: false, width: 24, description: 'Persona de contacto', example: 'Juan Pérez' },
    ],
  },

  // ── CATEGORÍAS ─────────────────────────────
  categorias: {
    label: 'Categorías',
    icon: '📂',
    columnas: [
      { name: 'nombre', type: 'texto', required: true, width: 26, description: 'Nombre de la categoría', example: 'Anillos de Compromiso' },
      { name: 'descripcion', type: 'texto', required: false, width: 36, description: 'Descripción', example: 'Anillos de oro y plata' },
      { name: 'categoria_padre_id', type: 'número', required: false, width: 20, description: 'ID categoría padre', example: '' },
      { name: 'orden', type: 'número', required: false, width: 12, description: 'Orden', example: 1 },
    ],
  },

  // ── CLIENTES ───────────────────────────────
  clientes: {
    label: 'Clientes',
    icon: '👥',
    columnas: [
      { name: 'nombre', type: 'texto', required: true, width: 26, description: 'Nombre(s)', example: 'María' },
      { name: 'apellido', type: 'texto', required: false, width: 22, description: 'Apellido(s)', example: 'García López' },
      { name: 'email', type: 'texto', required: true, width: 32, description: 'Email único', example: 'maria@correo.com' },
      { name: 'telefono', type: 'texto', required: false, width: 16, description: 'Teléfono', example: '55 1234 5678' },
      { name: 'celular', type: 'texto', required: false, width: 16, description: 'Celular', example: '55 9876 5432' },
    ],
  },

  // ── TEMPORADAS ─────────────────────────────
  temporadas: {
    label: 'Temporadas',
    icon: '🗓️',
    columnas: [
      { name: 'nombre', type: 'texto', required: true, width: 26, description: 'Nombre', example: 'Primavera 2025' },
      { name: 'descripcion', type: 'texto', required: false, width: 36, description: 'Descripción', example: 'Piezas florales' },
      { name: 'fecha_inicio', type: 'fecha', required: true, width: 16, description: 'Fecha inicio', example: '2025-03-01' },
      { name: 'fecha_fin', type: 'fecha', required: true, width: 16, description: 'Fecha fin', example: '2025-05-31' },
    ],
  },

  // ── TIPOS DE PRODUCTO ──────────────────────
  tipos_producto: {
    label: 'Tipos de Producto',
    icon: '🏷️',
    columnas: [
      { name: 'nombre', type: 'texto', required: true, width: 26, description: 'Nombre', example: 'Joyería Artesanal' },
      { name: 'descripcion', type: 'texto', required: false, width: 40, description: 'Descripción', example: 'Piezas artesanales' },
    ],
  },

  // ── PROMOCIONES ────────────────────────────
  promociones: {
    label: 'Promociones',
    icon: '🎉',
    columnas: [
      { name: 'nombre', type: 'texto', required: true, width: 26, description: 'Nombre', example: 'Descuento Primavera' },
      { name: 'codigo_cupon', type: 'texto', required: false, width: 18, description: 'Código', example: 'PRIMAVERA25' },
      { name: 'tipo', type: 'texto', required: true, width: 16, description: 'porcentaje | monto_fijo', example: 'porcentaje' },
      { name: 'valor_descuento', type: 'decimal', required: true, width: 16, description: 'Valor', example: 25.00 },
      { name: 'fecha_inicio', type: 'fecha', required: true, width: 16, description: 'Inicio', example: '2025-03-01' },
      { name: 'fecha_fin', type: 'fecha', required: true, width: 16, description: 'Fin', example: '2025-04-30' },
    ],
  },

  // ── MÉTODOS DE PAGO ────────────────────────
  metodos_pago: {
    label: 'Métodos de Pago',
    icon: '💳',
    columnas: [
      { name: 'nombre', type: 'texto', required: true, width: 26, description: 'Nombre', example: 'Transferencia SPEI' },
      { name: 'codigo', type: 'texto', required: true, width: 20, description: 'Código único', example: 'transferencia_spei' },
      { name: 'tipo', type: 'texto', required: true, width: 18, description: 'transferencia | efectivo | tarjeta', example: 'transferencia' },
      { name: 'orden', type: 'número', required: false, width: 12, description: 'Orden', example: 1 },
    ],
  },

  // ── PREGUNTAS FRECUENTES ───────────────────
  preguntas_frecuentes: {
    label: 'Preguntas Frecuentes',
    icon: '❓',
    columnas: [
      { name: 'categoria', type: 'texto', required: false, width: 20, description: 'Categoría', example: 'Envíos' },
      { name: 'pregunta', type: 'texto', required: true, width: 40, description: 'Pregunta', example: '¿Cuánto tarda el envío?' },
      { name: 'respuesta', type: 'texto', required: true, width: 50, description: 'Respuesta', example: '3-5 días hábiles' },
      { name: 'orden', type: 'número', required: false, width: 12, description: 'Orden', example: 1 },
    ],
  },

  // ✅ VENTAS - CON RELACIONES CORREGIDAS
  ventas: {
    label: 'Ventas',
    icon: '💰',
    columnas: [
      { name: 'cliente_id', type: 'número', required: true, width: 14, description: 'ID del cliente', example: 1 },
      { name: 'cliente_nombre_completo', type: 'texto', required: false, width: 28, description: 'Nombre completo del cliente', example: 'María García López' },
      { name: 'cliente_email', type: 'texto', required: true, width: 28, description: 'Email del cliente', example: 'maria@email.com' },
      { name: 'cliente_telefono', type: 'texto', required: false, width: 16, description: 'Teléfono del cliente', example: '5512345678' },
      { name: 'metodo_pago_id', type: 'número', required: true, width: 16, description: 'ID del método de pago', example: 1 },
      { name: 'estado', type: 'texto', required: false, width: 18, description: 'pendiente | confirmado | en_preparacion | enviado | entregado | cancelado', example: 'pendiente' },
      { name: 'subtotal', type: 'decimal', required: true, width: 16, description: 'Subtotal sin IVA ni envío', example: 1000.00 },
      { name: 'descuento', type: 'decimal', required: false, width: 16, description: 'Descuento total aplicado', example: 0.00 },
      { name: 'iva', type: 'decimal', required: true, width: 14, description: 'IVA (generalmente 16%)', example: 160.00 },
      { name: 'costo_envio', type: 'decimal', required: false, width: 16, description: 'Costo de envío', example: 100.00 },
      { name: 'total', type: 'decimal', required: true, width: 16, description: 'Total a pagar', example: 1260.00 },
      { name: 'fecha_creacion', type: 'fecha', required: false, width: 16, description: 'Fecha de la venta (YYYY-MM-DD)', example: '2024-01-15' },
      { name: 'fecha_limite_pago', type: 'fecha', required: false, width: 18, description: 'Fecha límite para pagar (YYYY-MM-DD HH:MM:SS)', example: '2024-01-20 23:59:59' },
      { name: 'notas_cliente', type: 'texto', required: false, width: 36, description: 'Notas o instrucciones del cliente', example: 'Entregar antes de las 5pm' },
      { name: 'notas_internas', type: 'texto', required: false, width: 36, description: 'Notas internas para el equipo', example: 'Cliente frecuente' },
      { name: 'tipo_entrega', type: 'texto', required: false, width: 18, description: 'domicilio | tienda', example: 'domicilio' },
      { name: 'direccion_entrega_id', type: 'número', required: false, width: 18, description: 'ID de dirección del cliente', example: 1 },
      { name: 'trabajador_id', type: 'número', required: false, width: 16, description: 'ID del trabajador que atendió', example: 1 },
      { name: 'numero_guia', type: 'texto', required: false, width: 18, description: 'Número de guía de envío', example: 'PAK-123456789' },
      { name: 'paqueteria', type: 'texto', required: false, width: 18, description: 'Nombre de la paquetería', example: 'Estafeta' },
      { name: 'fecha_estimada_entrega', type: 'fecha', required: false, width: 18, description: 'Fecha estimada de entrega', example: '2024-01-20' },
      { name: 'codigo_entrega', type: 'texto', required: false, width: 18, description: 'Código único para confirmar entrega', example: 'ABC123XYZ' },
    ],
    relaciones: {
      clientes: 'SELECT id, CONCAT(nombre, \' \', COALESCE(apellido, \'\')) as nombre FROM clientes WHERE activo = true ORDER BY nombre LIMIT 100',
      metodos_pago: 'SELECT id, nombre FROM metodos_pago WHERE activo = true ORDER BY orden',
      // ✅ CORREGIDO: Incluir 'trabajador' como rol válido
      trabajadores: `SELECT id, nombre FROM usuarios WHERE rol IN ('admin', 'gestor_pedidos', 'gestor_ventas', 'trabajador') ORDER BY nombre LIMIT 100`,
    },
  },

  // ✅ DETALLE_VENTAS - CON RELACIONES CORREGIDAS
  detalle_ventas: {
    label: 'Detalle de Ventas',
    icon: '📦',
    columnas: [
      { name: 'venta_id', type: 'número', required: true, width: 14, description: 'ID de la venta (debe existir en tabla ventas)', example: 1 },
      { name: 'producto_id', type: 'número', required: true, width: 14, description: 'ID del producto', example: 101 },
      { name: 'producto_codigo', type: 'texto', required: false, width: 18, description: 'Código del producto (alternativa a producto_id)', example: 'PROD-001' },
      { name: 'producto_nombre', type: 'texto', required: false, width: 28, description: 'Nombre del producto (snapshot histórico)', example: 'Anillo de Oro 18k' },
      { name: 'producto_imagen', type: 'texto', required: false, width: 36, description: 'URL de la imagen del producto', example: 'https://...' },
      { name: 'cantidad', type: 'número', required: true, width: 12, description: 'Cantidad de unidades vendidas', example: 2 },
      { name: 'precio_unitario', type: 'decimal', required: true, width: 16, description: 'Precio por unidad al momento de la venta', example: 500.00 },
      { name: 'descuento_unitario', type: 'decimal', required: false, width: 18, description: 'Descuento aplicado por unidad', example: 0.00 },
      { name: 'personalizacion', type: 'json', required: false, width: 40, description: 'Detalles de personalización en formato JSON', example: '{"talla":"7","grabado":"Te amo"}' },
    ],
    relaciones: {
      productos: 'SELECT id, codigo, nombre FROM productos WHERE activo = true ORDER BY nombre LIMIT 100',
      // ✅ CORREGIDO: Mostrar más información de la venta (folio + cliente)
      ventas: `SELECT id, folio, cliente_nombre_completo FROM ventas ORDER BY id DESC LIMIT 100`,
    },
  },
};

// ============================================
// FUNCIONES DE ESTILO (sin cambios)
// ============================================
function styleCell(cell: ExcelJS.Cell, opts: any = {}) {
  const { bold = false, italic = false, size = 10, fg = C.TEXT_DARK, bg, alignH = 'left', alignV = 'center', wrap = false, borderColor } = opts;
  cell.font = { name: 'Arial', bold, italic, size, color: { argb: fg } };
  cell.alignment = { horizontal: alignH, vertical: alignV, wrapText: wrap };
  if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  if (borderColor) {
    const s: ExcelJS.BorderStyle = 'thin';
    cell.border = {
      top: { style: s, color: { argb: borderColor } },
      bottom: { style: s, color: { argb: borderColor } },
      left: { style: s, color: { argb: borderColor } },
      right: { style: s, color: { argb: borderColor } },
    };
  }
}

function buildDatosSheet(wb: ExcelJS.Workbook, config: TemplateConfig) {
  const ws = wb.addWorksheet('DATOS', { properties: { tabColor: { argb: C.ROSA } }, views: [{ state: 'frozen', ySplit: 8, xSplit: 0 }] });
  const n = config.columnas.length;

  ws.mergeCells(1, 1, 1, n);
  const titleCell = ws.getCell('A1');
  titleCell.value = `${config.icon}  JOYERÍA DIANA LAURA — Importación de ${config.label.toUpperCase()}`;
  styleCell(titleCell, { bold: true, size: 13, fg: C.WHITE, bg: C.BRAND_DARK, alignH: 'center' });
  ws.getRow(1).height = 34;

  ws.mergeCells(2, 1, 2, n);
  const subCell = ws.getCell('A2');
  subCell.value = '★ Los campos REQUERIDO son obligatorios | Rellena desde fila 9 | No modifiques filas 1-8';
  styleCell(subCell, { italic: true, size: 9, fg: C.ROSA, bg: C.BRAND_MID, alignH: 'center' });
  ws.getRow(2).height = 18;

  ws.mergeCells(3, 1, 3, n);
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ROSA } };
  ws.getRow(3).height = 5;

  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = col.name;
    styleCell(cell, { bold: true, size: 10, fg: C.WHITE, bg: col.required ? C.REQ_DARK : 'FF37474F', alignH: 'center', borderColor: C.BRAND_DARK });
  });
  ws.getRow(4).height = 22;

  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(5, i + 1);
    cell.value = col.required ? '● REQUERIDO' : '○ Opcional';
    styleCell(cell, { bold: col.required, size: 8, fg: col.required ? C.REQ_DARK : C.OPT_DARK, bg: col.required ? C.REQ_LIGHT : C.OPT_LIGHT, alignH: 'center', borderColor: C.GRAY_MED });
  });
  ws.getRow(5).height = 16;

  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(6, i + 1);
    cell.value = `Tipo: ${col.type}`;
    styleCell(cell, { italic: true, size: 8, fg: 'FF555555', bg: C.GRAY_LIGHT, alignH: 'center', borderColor: C.GRAY_MED });
  });
  ws.getRow(6).height = 15;

  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(7, i + 1);
    cell.value = col.description;
    styleCell(cell, { size: 8, fg: C.INFO_FG, bg: C.INFO_BG, wrap: true, borderColor: C.GRAY_MED });
  });
  ws.getRow(7).height = 30;

  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(8, i + 1);
    cell.value = col.example;
    styleCell(cell, { italic: true, size: 10, fg: 'FF4E342E', bg: C.EX_BG, borderColor: C.GRAY_MED });
  });
  ws.getRow(8).height = 20;

  for (let r = 9; r <= 208; r++) {
    const bg = r % 2 === 0 ? C.ROW_A : C.ROW_B;
    for (let c = 1; c <= n; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = {
        top: { style: 'hair', color: { argb: C.GRAY_MED } },
        bottom: { style: 'hair', color: { argb: C.GRAY_MED } },
        left: { style: 'hair', color: { argb: C.GRAY_MED } },
        right: { style: 'hair', color: { argb: C.GRAY_MED } },
      };
      cell.font = { name: 'Arial', size: 10, color: { argb: C.TEXT_DARK } };
      cell.alignment = { vertical: 'middle' };
    }
    ws.getRow(r).height = 18;
  }

  config.columnas.forEach((col, i) => { ws.getColumn(i + 1).width = col.width ?? 18; });
  ws.views = [{ state: 'frozen', ySplit: 8, xSplit: 0, topLeftCell: 'A9', activeCell: 'A9' }];
}

function buildInstruccionesSheet(wb: ExcelJS.Workbook, config: TemplateConfig) {
  const ws = wb.addWorksheet('INSTRUCCIONES', { properties: { tabColor: { argb: 'FF4CAF50' } } });
  ws.getColumn(1).width = 4; ws.getColumn(2).width = 32; ws.getColumn(3).width = 48; ws.getColumn(4).width = 20;

  ws.mergeCells('A1:D1'); const t = ws.getCell('A1');
  t.value = `📋 INSTRUCCIONES — ${config.label.toUpperCase()}`;
  styleCell(t, { bold: true, size: 13, fg: C.WHITE, bg: C.BRAND_DARK, alignH: 'center' });
  ws.getRow(1).height = 32;

  ws.mergeCells('A2:D2'); const sub = ws.getCell('A2');
  sub.value = 'Sigue estos pasos para importar correctamente';
  styleCell(sub, { italic: true, size: 10, fg: C.ROSA, bg: C.BRAND_MID, alignH: 'center' });
  ws.getRow(2).height = 20;

  ws.mergeCells('A3:D3');
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ROSA } };
  ws.getRow(3).height = 5;

  const headers = ['#', 'Paso', 'Descripción', 'Ejemplo'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = h;
    styleCell(cell, { bold: true, size: 10, fg: C.WHITE, bg: C.BRAND_DARK, alignH: 'center', borderColor: C.BRAND_DARK });
  });
  ws.getRow(4).height = 22;

  const steps = [
    ['01', 'Ir a hoja "DATOS"', 'Haz clic en la pestaña DATOS', '→ Pestaña DATOS'],
    ['02', 'Revisar columnas', 'Campos REQUERIDO en verde son obligatorios', 'nombre, categoria_id...'],
    ['03', 'Ingresar datos', 'Desde fila 9, no modificar filas 1-8', 'Escribe desde A9'],
    ['04', 'Formato números', 'Usa punto para decimales, sin símbolos', '2500.00 (no $2,500)'],
    ['05', 'Formato fechas', 'Usa YYYY-MM-DD', '2025-12-31'],
    ['06', 'Valores booleanos', 'TRUE o FALSE en mayúsculas', 'TRUE / FALSE'],
    ['07', 'IDs de relaciones', 'Usa IDs válidos de hoja CATÁLOGOS', 'categoria_id: 1'],
  ];

  steps.forEach(([num, paso, desc, ej], idx) => {
    const row = idx + 5;
    const bg = idx % 2 === 0 ? C.WHITE : C.ROSA_SUAVE;
    const numCell = ws.getCell(row, 1); numCell.value = num;
    styleCell(numCell, { bold: true, size: 10, fg: C.WHITE, bg: C.ROSA, alignH: 'center', borderColor: C.GRAY_MED });
    const pasoCell = ws.getCell(row, 2); pasoCell.value = paso;
    styleCell(pasoCell, { bold: true, size: 10, fg: C.BRAND_DARK, bg, borderColor: C.GRAY_MED });
    const descCell = ws.getCell(row, 3); descCell.value = desc;
    styleCell(descCell, { size: 10, fg: C.TEXT_DARK, bg, wrap: true, borderColor: C.GRAY_MED });
    const ejCell = ws.getCell(row, 4); ejCell.value = ej;
    styleCell(ejCell, { italic: true, size: 9, fg: 'FF4E342E', bg: C.EX_BG, borderColor: C.GRAY_MED });
    ws.getRow(row).height = 22;
  });
}

async function buildCatalogosSheet(wb: ExcelJS.Workbook, config: TemplateConfig, relaciones: { [key: string]: Array<{ id: number; nombre: string }> }) {
  if (!config.relaciones || Object.keys(relaciones).length === 0) return;
  const ws = wb.addWorksheet('CATÁLOGOS', { properties: { tabColor: { argb: 'FF2196F3' } } });
  ws.mergeCells('A1:F1'); const t = ws.getCell('A1');
  t.value = '🔗 CATÁLOGOS — IDs válidos';
  styleCell(t, { bold: true, size: 12, fg: C.WHITE, bg: C.BRAND_DARK, alignH: 'center' });
  ws.getRow(1).height = 30;
  ws.mergeCells('A2:F2'); const sub = ws.getCell('A2');
  sub.value = 'Usa estos IDs para campos *_id';
  styleCell(sub, { italic: true, size: 9, fg: C.ROSA, bg: C.BRAND_MID, alignH: 'center' });
  ws.getRow(2).height = 18;
  ws.mergeCells('A3:F3');
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ROSA } };
  ws.getRow(3).height = 5;

  let startCol = 1;
  for (const [tabla, rows] of Object.entries(relaciones)) {
    const headerRow = 4;
    ws.mergeCells(headerRow, startCol, headerRow, startCol + 1);
    const cell1 = ws.getCell(headerRow, startCol);
    cell1.value = `📋 ${tabla.toUpperCase()}`;
    styleCell(cell1, { bold: true, size: 10, fg: C.WHITE, bg: C.BRAND_ACCENT, alignH: 'center', borderColor: C.BRAND_DARK });
    ws.getRow(headerRow).height = 22;

    const sh1 = ws.getCell(5, startCol); sh1.value = 'ID';
    styleCell(sh1, { bold: true, size: 9, fg: C.TEXT_DARK, bg: C.ROSA_MED, alignH: 'center', borderColor: C.GRAY_MED });
    const sh2 = ws.getCell(5, startCol + 1); sh2.value = 'Nombre';
    styleCell(sh2, { bold: true, size: 9, fg: C.TEXT_DARK, bg: C.ROSA_MED, alignH: 'center', borderColor: C.GRAY_MED });
    ws.getRow(5).height = 18;

    rows.forEach((row, idx) => {
      const r = idx + 6;
      const bg = idx % 2 === 0 ? C.WHITE : C.ROSA_SUAVE;
      const idCell = ws.getCell(r, startCol); idCell.value = row.id;
      styleCell(idCell, { bold: true, size: 10, fg: C.BRAND_DARK, bg, alignH: 'center', borderColor: C.GRAY_MED });
      const nameCell = ws.getCell(r, startCol + 1); nameCell.value = row.nombre;
      styleCell(nameCell, { size: 10, fg: C.TEXT_DARK, bg, borderColor: C.GRAY_MED });
      ws.getRow(r).height = 18;
    });
    ws.getColumn(startCol).width = 8;
    ws.getColumn(startCol + 1).width = 32;
    startCol += 3;
  }
}

// ============================================
// CONTROLADOR
// ============================================
export const templateController = {
  async downloadTemplate(req: AuthRequest, res: Response) {
    try {
      const { tableName } = req.params;
      console.log(`📥 Descargando plantilla para: ${tableName}`);
      
      if (!TEMPLATE_CONFIG[tableName]) {
        console.log(`❌ No hay plantilla para: ${tableName}`);
        return res.status(404).json({
          success: false,
          message: `No hay plantilla disponible para "${tableName}". Tablas disponibles: ${Object.keys(TEMPLATE_CONFIG).join(', ')}`
        });
      }
      
      const config = TEMPLATE_CONFIG[tableName];
      const relaciones: { [key: string]: Array<{ id: number; nombre: string }> } = {};
      
      if (config.relaciones) {
        for (const [campo, query] of Object.entries(config.relaciones)) {
          try {
            console.log(`🔍 Ejecutando consulta para ${campo}:`, query);
            const result = await pool.query(query);
            relaciones[campo] = result.rows;
            console.log(`✅ Cargada relación ${campo}: ${result.rows.length} registros`);
          } catch (error) {
            console.error(`Error loading ${campo}:`, error);
            relaciones[campo] = [];
          }
        }
      }
      
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Joyería Diana Laura';
      buildDatosSheet(wb, config);
      buildInstruccionesSheet(wb, config);
      await buildCatalogosSheet(wb, config, relaciones);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=plantilla_${tableName}_${Date.now()}.xlsx`);
      await wb.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ success: false, message: 'Error al generar plantilla' });
    }
  },

  async getTemplateInfo(req: AuthRequest, res: Response) {
    try {
      const { tableName } = req.params;
      if (!TEMPLATE_CONFIG[tableName]) {
        return res.status(404).json({ success: false, message: `No hay plantilla para "${tableName}"` });
      }
      const config = TEMPLATE_CONFIG[tableName];
      const relaciones: Record<string, any[]> = {};
      if (config.relaciones) {
        for (const [campo, query] of Object.entries(config.relaciones)) {
          try {
            const result = await pool.query(query);
            relaciones[campo] = result.rows;
          } catch (error) {
            relaciones[campo] = [];
          }
        }
      }
      res.json({ success: true, data: { label: config.label, icon: config.icon, columnas: config.columnas, relaciones } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener información' });
    }
  },
};