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
  label: string;           // Human-readable table name
  icon: string;            // Emoji icon
  columnas: ColumnaConfig[];
  relaciones?: { [key: string]: string };
}

// ─────────────────────────────────────────────
//  PALETA DE COLORES — Joyería Diana Laura
// ─────────────────────────────────────────────
const C = {
  // Brand
  BRAND_DARK:    'FF1A1A2E',  // Deep navy
  BRAND_MID:     'FF16213E',  // Navy
  BRAND_ACCENT:  'FF0F3460',  // Dark blue
  ROSA:          'FFECB2C3',  // Brand pink
  ROSA_SUAVE:    'FFFFF0F3',  // Very light pink
  ROSA_MED:      'FFF7C5D3',  // Medium pink

  // Functional
  REQ_DARK:      'FF1B4332',  // Dark green
  REQ_LIGHT:     'FFD6F5E3',  // Light green
  OPT_DARK:      'FF7D6608',  // Dark gold
  OPT_LIGHT:     'FFFFF8DC',  // Light yellow
  INFO_BG:       'FFE8F4FD',  // Light blue
  INFO_FG:       'FF1A5276',  // Dark blue text
  EX_BG:         'FFFFF9C4',  // Example row yellow

  // Neutrals
  WHITE:         'FFFFFFFF',
  GRAY_LIGHT:    'FFF5F5F5',
  GRAY_MED:      'FFD0D0D0',
  TEXT_DARK:     'FF1A1A1A',
  TEXT_MUTED:    'FF666666',

  // Row alternation
  ROW_A:         'FFFFFFFF',
  ROW_B:         'FFFFF8FB',   // Very faint pink
} as const;

// ─────────────────────────────────────────────
//  CONFIGURACIÓN DE CADA PLANTILLA
// ─────────────────────────────────────────────
const TEMPLATE_CONFIG: { [key: string]: TemplateConfig } = {

  // ── PRODUCTOS ──────────────────────────────
  productos: {
    label: 'Productos',
    icon: '💎',
    columnas: [
      { name: 'nombre',             type: 'texto',    required: true,  width: 24, description: 'Nombre del producto',                       example: 'Anillo de Oro 18k' },
      { name: 'descripcion',        type: 'texto',    required: false, width: 32, description: 'Descripción detallada del artículo',         example: 'Anillo clásico con diseño elegante' },
      { name: 'categoria_id',       type: 'número',   required: true,  width: 16, description: 'ID de la categoría (ver hoja "Catálogos")',  example: 1 },
      { name: 'precio_compra',      type: 'decimal',  required: true,  width: 16, description: 'Precio de compra en MXN (ej: 1500.00)',      example: 2500.00 },
      { name: 'precio_oferta',      type: 'decimal',  required: false, width: 16, description: 'Precio de oferta en MXN (opcional)',         example: 2000.00 },
      { name: 'stock_actual',       type: 'número',   required: false, width: 14, description: 'Cantidad inicial en inventario',             example: 10 },
      { name: 'proveedor_id',       type: 'número',   required: false, width: 16, description: 'ID del proveedor (ver hoja "Catálogos")',    example: 1 },
      { name: 'material_principal', type: 'texto',    required: false, width: 20, description: 'Material principal (Oro, Plata, Acero...)',  example: 'Oro' },
      { name: 'peso_gramos',        type: 'decimal',  required: false, width: 14, description: 'Peso del artículo en gramos',                example: 5.5 },
      { name: 'es_nuevo',           type: 'booleano', required: false, width: 12, description: '¿Es producto nuevo? TRUE o FALSE',           example: 'TRUE' },
      { name: 'es_destacado',       type: 'booleano', required: false, width: 14, description: '¿Aparece como destacado? TRUE o FALSE',      example: 'FALSE' },
      { name: 'activo',             type: 'booleano', required: false, width: 12, description: '¿Producto activo? TRUE o FALSE',             example: 'TRUE' },
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
      { name: 'nombre',           type: 'texto', required: true,  width: 28, description: 'Nombre comercial del proveedor',           example: 'Joyas López S.A.' },
      { name: 'razon_social',     type: 'texto', required: false, width: 32, description: 'Razón social completa',                    example: 'Joyas López, S.A. de C.V.' },
      { name: 'rfc',              type: 'texto', required: false, width: 16, description: 'RFC (12 o 13 caracteres)',                  example: 'JLS123456XYZ' },
      { name: 'direccion',        type: 'texto', required: false, width: 36, description: 'Dirección completa',                       example: 'Av. Principal 123, Col. Centro, CDMX' },
      { name: 'telefono',         type: 'texto', required: false, width: 16, description: 'Teléfono de contacto',                     example: '55 1234 5678' },
      { name: 'email',            type: 'texto', required: false, width: 28, description: 'Correo electrónico de contacto',           example: 'contacto@proveedor.com' },
      { name: 'persona_contacto', type: 'texto', required: false, width: 24, description: 'Nombre de la persona de contacto',        example: 'Juan Pérez García' },
    ],
  },

  // ── CATEGORÍAS ─────────────────────────────
  categorias: {
    label: 'Categorías',
    icon: '📂',
    columnas: [
      { name: 'nombre',             type: 'texto',  required: true,  width: 26, description: 'Nombre de la categoría',                          example: 'Anillos de Compromiso' },
      { name: 'descripcion',        type: 'texto',  required: false, width: 36, description: 'Descripción breve de la categoría',                example: 'Anillos de oro y plata para compromiso' },
      { name: 'categoria_padre_id', type: 'número', required: false, width: 20, description: 'ID de la categoría padre (déjalo vacío si es raíz)', example: '' },
      { name: 'orden',              type: 'número', required: false, width: 12, description: 'Posición en el menú (1, 2, 3...)',                  example: 1 },
    ],
  },

  // ── CLIENTES ───────────────────────────────
  clientes: {
    label: 'Clientes',
    icon: '👥',
    columnas: [
      { name: 'nombre',    type: 'texto', required: true,  width: 26, description: 'Nombre(s) del cliente',             example: 'María' },
      { name: 'apellido',  type: 'texto', required: false, width: 22, description: 'Apellido(s) del cliente',            example: 'García López' },
      { name: 'email',     type: 'texto', required: true,  width: 32, description: 'Correo electrónico único',           example: 'maria@correo.com' },
      { name: 'telefono',  type: 'texto', required: false, width: 16, description: 'Teléfono fijo',                      example: '55 1234 5678' },
      { name: 'celular',   type: 'texto', required: false, width: 16, description: 'Teléfono celular / WhatsApp',        example: '55 9876 5432' },
      { name: 'direccion', type: 'texto', required: false, width: 36, description: 'Dirección de envío principal',       example: 'Calle 123, Col. Centro, CDMX' },
    ],
  },

  // ── TEMPORADAS ─────────────────────────────
  temporadas: {
    label: 'Temporadas',
    icon: '🗓️',
    columnas: [
      { name: 'nombre',       type: 'texto', required: true,  width: 26, description: 'Nombre de la temporada o colección',     example: 'Colección Primavera 2025' },
      { name: 'descripcion',  type: 'texto', required: false, width: 36, description: 'Descripción de la temporada',             example: 'Piezas florales y colores pastel' },
      { name: 'fecha_inicio', type: 'fecha', required: true,  width: 16, description: 'Fecha de inicio (formato YYYY-MM-DD)',    example: '2025-03-01' },
      { name: 'fecha_fin',    type: 'fecha', required: true,  width: 16, description: 'Fecha de fin (formato YYYY-MM-DD)',       example: '2025-05-31' },
    ],
  },

  // ── TIPOS DE PRODUCTO ──────────────────────
  tipos_producto: {
    label: 'Tipos de Producto',
    icon: '🏷️',
    columnas: [
      { name: 'nombre',      type: 'texto', required: true,  width: 26, description: 'Nombre del tipo (ej: Joyería Fina, Bisutería)', example: 'Joyería Artesanal' },
      { name: 'descripcion', type: 'texto', required: false, width: 40, description: 'Descripción del tipo de producto',               example: 'Piezas elaboradas a mano con técnicas artesanales' },
    ],
  },

  // ── PROMOCIONES ────────────────────────────
  promociones: {
    label: 'Promociones',
    icon: '🎉',
    columnas: [
      { name: 'nombre',               type: 'texto',  required: true,  width: 26, description: 'Nombre de la promoción',                      example: 'Descuento Primavera' },
      { name: 'codigo_cupon',         type: 'texto',  required: false, width: 18, description: 'Código único del cupón',                      example: 'PRIMAVERA25' },
      { name: 'descripcion',          type: 'texto',  required: false, width: 36, description: 'Descripción de la promoción',                  example: '25% de descuento en toda la colección' },
      { name: 'tipo',                 type: 'texto',  required: true,  width: 16, description: 'porcentaje | monto_fijo | envio_gratis',      example: 'porcentaje' },
      { name: 'valor_descuento',      type: 'decimal', required: true,  width: 16, description: 'Valor del descuento (ej: 25 para 25%)',       example: 25.00 },
      { name: 'fecha_inicio',         type: 'fecha',  required: true,  width: 16, description: 'Fecha de inicio (YYYY-MM-DD)',                example: '2025-03-01' },
      { name: 'fecha_fin',            type: 'fecha',  required: true,  width: 16, description: 'Fecha de fin (YYYY-MM-DD)',                   example: '2025-04-30' },
      { name: 'monto_minimo_compra',  type: 'decimal', required: false, width: 18, description: 'Monto mínimo para aplicar promoción',         example: 500.00 },
    ],
  },

  // ── MÉTODOS DE PAGO ────────────────────────
  metodos_pago: {
    label: 'Métodos de Pago',
    icon: '💳',
    columnas: [
      { name: 'nombre',   type: 'texto',  required: true,  width: 26, description: 'Nombre visible al cliente',                 example: 'Transferencia SPEI' },
      { name: 'codigo',   type: 'texto',  required: true,  width: 20, description: 'Código único sin espacios (minúsculas)',    example: 'transferencia_spei' },
      { name: 'tipo',     type: 'texto',  required: true,  width: 18, description: 'Tipo: transferencia, efectivo, tarjeta',   example: 'transferencia' },
      { name: 'descripcion', type: 'texto', required: false, width: 36, description: 'Instrucciones adicionales para el cliente', example: 'Pago por SPEI a cuenta CLABE indicada' },
      { name: 'orden',    type: 'número', required: false, width: 12, description: 'Posición en el checkout',                  example: 1 },
    ],
  },

  // ── PREGUNTAS FRECUENTES ───────────────────
  preguntas_frecuentes: {
    label: 'Preguntas Frecuentes',
    icon: '❓',
    columnas: [
      { name: 'categoria', type: 'texto',  required: false, width: 20, description: 'Categoría de la pregunta (Envíos, Pagos, etc.)', example: 'Envíos' },
      { name: 'pregunta',  type: 'texto',  required: true,  width: 40, description: 'Pregunta del cliente',                           example: '¿Cuánto tiempo tarda mi pedido?' },
      { name: 'respuesta', type: 'texto',  required: true,  width: 50, description: 'Respuesta completa',                             example: 'Los pedidos se entregan en 3-5 días hábiles.' },
      { name: 'orden',     type: 'número', required: false, width: 12, description: 'Orden de aparición (1, 2, 3...)',                 example: 1 },
    ],
  },

  // ✅ NUEVO: VENTAS ───────────────────────────
  ventas: {
    label: 'Ventas',
    icon: '💰',
    columnas: [
      { name: 'cliente_id',               type: 'número',   required: true,  width: 14, description: 'ID del cliente (ver tabla clientes o hoja Catálogos)', example: 1 },
      { name: 'cliente_nombre_completo',  type: 'texto',    required: false, width: 28, description: 'Nombre completo del cliente (si no tienes ID)',        example: 'María García López' },
      { name: 'cliente_email',            type: 'texto',    required: true,  width: 28, description: 'Correo electrónico del cliente',                       example: 'maria@email.com' },
      { name: 'cliente_telefono',         type: 'texto',    required: false, width: 16, description: 'Teléfono de contacto',                                  example: '5512345678' },
      { name: 'metodo_pago_id',           type: 'número',   required: true,  width: 16, description: 'ID del método de pago (ver hoja Catálogos)',            example: 1 },
      { name: 'estado',                   type: 'texto',    required: false, width: 18, description: 'pendiente | confirmado | en_preparacion | enviado | entregado | cancelado', example: 'pendiente' },
      { name: 'subtotal',                 type: 'decimal',  required: true,  width: 16, description: 'Subtotal sin IVA ni envío',                             example: 1000.00 },
      { name: 'descuento',                type: 'decimal',  required: false, width: 16, description: 'Monto total de descuento aplicado',                     example: 0.00 },
      { name: 'iva',                      type: 'decimal',  required: true,  width: 14, description: 'Monto de IVA (generalmente 16%)',                       example: 160.00 },
      { name: 'costo_envio',              type: 'decimal',  required: false, width: 16, description: 'Costo de envío',                                        example: 100.00 },
      { name: 'total',                    type: 'decimal',  required: true,  width: 16, description: 'Total a pagar (subtotal - descuento + iva + envío)',    example: 1260.00 },
      { name: 'fecha_creacion',           type: 'fecha',    required: false, width: 16, description: 'Fecha de la venta (YYYY-MM-DD). Si se omite, usa hoy', example: '2024-01-15' },
      { name: 'notas_cliente',            type: 'texto',    required: false, width: 36, description: 'Notas o instrucciones del cliente',                     example: 'Entregar antes de las 5pm' },
      { name: 'notas_internas',           type: 'texto',    required: false, width: 36, description: 'Notas internas para el equipo',                         example: 'Cliente frecuente' },
      { name: 'tipo_entrega',             type: 'texto',    required: false, width: 18, description: 'domicilio | tienda',                                    example: 'domicilio' },
      { name: 'direccion_entrega_id',     type: 'número',   required: false, width: 18, description: 'ID de dirección del cliente (si aplica)',               example: 1 },
      { name: 'trabajador_id',            type: 'número',   required: false, width: 16, description: 'ID del trabajador que atendió la venta',                example: 1 },
      { name: 'numero_guia',              type: 'texto',    required: false, width: 18, description: 'Número de guía de envío',                               example: 'PAK-123456789' },
      { name: 'paqueteria',               type: 'texto',    required: false, width: 18, description: 'Nombre de la paquetería',                               example: 'Estafeta' },
      { name: 'fecha_estimada_entrega',   type: 'fecha',    required: false, width: 18, description: 'Fecha estimada de entrega (YYYY-MM-DD)',                example: '2024-01-20' },
      { name: 'codigo_entrega',           type: 'texto',    required: false, width: 18, description: 'Código único para confirmar entrega',                   example: 'ABC123XYZ' },
    ],
    relaciones: {
      clientes: 'SELECT id, CONCAT(nombre, \' \', COALESCE(apellido, \'\')) as nombre FROM clientes WHERE activo = true ORDER BY nombre',
      metodos_pago: 'SELECT id, nombre FROM metodos_pago WHERE activo = true ORDER BY orden',
      trabajadores: 'SELECT id, nombre FROM usuarios WHERE rol IN (\'admin\', \'gestor_pedidos\', \'gestor_ventas\') ORDER BY nombre',
    },
  },

  // ✅ NUEVO: DETALLE VENTAS ───────────────────
  detalle_ventas: {
    label: 'Detalle de Ventas',
    icon: '📦',
    columnas: [
      { name: 'venta_id',           type: 'número',   required: true,  width: 14, description: 'ID de la venta (debe existir en tabla ventas)',           example: 1 },
      { name: 'producto_id',        type: 'número',   required: true,  width: 14, description: 'ID del producto (ver hoja Catálogos)',                    example: 101 },
      { name: 'producto_codigo',    type: 'texto',    required: false, width: 18, description: 'Código del producto (alternativa a producto_id)',         example: 'PROD-001' },
      { name: 'producto_nombre',    type: 'texto',    required: false, width: 28, description: 'Nombre del producto (snapshot histórico)',                example: 'Anillo de Oro 18k' },
      { name: 'cantidad',           type: 'número',   required: true,  width: 12, description: 'Cantidad de unidades vendidas',                           example: 2 },
      { name: 'precio_unitario',    type: 'decimal',  required: true,  width: 16, description: 'Precio por unidad al momento de la venta',                example: 500.00 },
      { name: 'descuento_unitario', type: 'decimal',  required: false, width: 18, description: 'Descuento aplicado por unidad',                           example: 0.00 },
      { name: 'personalizacion',    type: 'json',     required: false, width: 40, description: 'Detalles de personalización en formato JSON',             example: '{"talla":"7","grabado":"Te amo"}' },
    ],
    relaciones: {
      productos: 'SELECT id, codigo, nombre FROM productos WHERE activo = true ORDER BY nombre LIMIT 100',
      ventas: 'SELECT id, folio, cliente_nombre_completo FROM ventas ORDER BY id DESC LIMIT 100',
    },
  },
};

// ─────────────────────────────────────────────
//  HELPER: estilizar una celda
// ─────────────────────────────────────────────
function styleCell(
  cell: ExcelJS.Cell,
  opts: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    fg?: string;           // font color ARGB
    bg?: string;           // fill color ARGB
    alignH?: string;
    alignV?: string;
    wrap?: boolean;
    borderColor?: string;
  } = {}
) {
  const {
    bold = false, italic = false, size = 10,
    fg = C.TEXT_DARK, bg,
    alignH = 'left', alignV = 'center',
    wrap = false, borderColor,
  } = opts;

  cell.font = { name: 'Arial', bold, italic, size, color: { argb: fg } };
  cell.alignment = { horizontal: alignH as ExcelJS.Alignment['horizontal'], vertical: alignV as ExcelJS.Alignment['vertical'], wrapText: wrap };

  if (bg) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } } as ExcelJS.FillPattern;
  }

  if (borderColor) {
    const s: ExcelJS.BorderStyle = 'thin';
    cell.border = {
      top:    { style: s, color: { argb: borderColor } },
      bottom: { style: s, color: { argb: borderColor } },
      left:   { style: s, color: { argb: borderColor } },
      right:  { style: s, color: { argb: borderColor } },
    };
  }
}

// ─────────────────────────────────────────────
//  HOJA 1: DATOS  (nueva estructura)
// ─────────────────────────────────────────────
function buildDatosSheet(wb: ExcelJS.Workbook, tableName: string, config: TemplateConfig) {
  const ws = wb.addWorksheet('DATOS', {
    properties: { tabColor: { argb: C.ROSA } },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 0 }],
  });

  const n = config.columnas.length;

  // ── ROW 1: Título grande (celdas combinadas) ──────────────────────────
  ws.mergeCells(1, 1, 1, n);
  const titleCell = ws.getCell('A1');
  titleCell.value = `${config.icon}  JOYERÍA DIANA LAURA — Importación de ${config.label.toUpperCase()}`;
  styleCell(titleCell, { bold: true, size: 13, fg: C.WHITE, bg: C.BRAND_DARK, alignH: 'center' });
  ws.getRow(1).height = 34;

  // ── ROW 2: Sub-título informativo ─────────────────────────────────────
  ws.mergeCells(2, 1, 2, n);
  const subCell = ws.getCell('A2');
  subCell.value = '★  Los campos marcados REQUERIDO son obligatorios   |   Rellena los datos a partir de la fila 9   |   No modifiques las filas 1 a 8';
  styleCell(subCell, { italic: true, size: 9, fg: C.ROSA, bg: C.BRAND_MID, alignH: 'center' });
  ws.getRow(2).height = 18;

  // ── ROW 3: Franja decorativa rosa (accent bar) ───────────────────────
  ws.mergeCells(3, 1, 3, n);
  const accentCell = ws.getCell('A3');
  accentCell.value = '';
  accentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ROSA } } as ExcelJS.FillPattern;
  ws.getRow(3).height = 5;

  // ── ROW 4: Nombre del campo ───────────────────────────────────────────
  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = col.name;
    styleCell(cell, {
      bold: true, size: 10, fg: C.WHITE,
      bg: col.required ? C.REQ_DARK : 'FF37474F',
      alignH: 'center', borderColor: C.BRAND_DARK,
    });
  });
  ws.getRow(4).height = 22;

  // ── ROW 5: Badge REQUERIDO / Opcional ────────────────────────────────
  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(5, i + 1);
    cell.value = col.required ? '● REQUERIDO' : '○ Opcional';
    styleCell(cell, {
      bold: col.required, size: 8,
      fg: col.required ? C.REQ_DARK : C.OPT_DARK,
      bg: col.required ? C.REQ_LIGHT : C.OPT_LIGHT,
      alignH: 'center', borderColor: C.GRAY_MED,
    });
  });
  ws.getRow(5).height = 16;

  // ── ROW 6: Tipo de dato ───────────────────────────────────────────────
  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(6, i + 1);
    cell.value = `Tipo: ${col.type}`;
    styleCell(cell, { italic: true, size: 8, fg: 'FF555555', bg: C.GRAY_LIGHT, alignH: 'center', borderColor: C.GRAY_MED });
  });
  ws.getRow(6).height = 15;

  // ── ROW 7: Descripción ────────────────────────────────────────────────
  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(7, i + 1);
    cell.value = col.description;
    styleCell(cell, { size: 8, fg: C.INFO_FG, bg: C.INFO_BG, wrap: true, borderColor: C.GRAY_MED });
  });
  ws.getRow(7).height = 30;

  // ── ROW 8: Fila de ejemplo ────────────────────────────────────────────
  config.columnas.forEach((col, i) => {
    const cell = ws.getCell(8, i + 1);
    cell.value = col.example;
    styleCell(cell, { italic: true, size: 10, fg: 'FF4E342E', bg: C.EX_BG, borderColor: C.GRAY_MED });
  });
  ws.getRow(8).height = 20;

  // ── ROWS 9-208: Data input rows (alternating) ─────────────────────────
  for (let r = 9; r <= 208; r++) {
    const bg = r % 2 === 0 ? C.ROW_A : C.ROW_B;
    for (let c = 1; c <= n; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } } as ExcelJS.FillPattern;
      cell.border = {
        top:    { style: 'hair', color: { argb: C.GRAY_MED } },
        bottom: { style: 'hair', color: { argb: C.GRAY_MED } },
        left:   { style: 'hair', color: { argb: C.GRAY_MED } },
        right:  { style: 'hair', color: { argb: C.GRAY_MED } },
      };
      cell.font = { name: 'Arial', size: 10, color: { argb: C.TEXT_DARK } };
      cell.alignment = { vertical: 'middle' as ExcelJS.Alignment['vertical'] };
    }
    ws.getRow(r).height = 18;
  }

  // ── Anchos de columna ─────────────────────────────────────────────────
  config.columnas.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width ?? 18;
  });

  // ── Freeze panes ──────────────────────────────────────────────────────
  ws.views = [{ state: 'frozen', ySplit: 8, xSplit: 0, topLeftCell: 'A9', activeCell: 'A9' }];
}

// ─────────────────────────────────────────────
//  HOJA 2: INSTRUCCIONES
// ─────────────────────────────────────────────
function buildInstruccionesSheet(wb: ExcelJS.Workbook, config: TemplateConfig) {
  const ws = wb.addWorksheet('INSTRUCCIONES', {
    properties: { tabColor: { argb: 'FF4CAF50' } },
  });

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 32;
  ws.getColumn(3).width = 48;
  ws.getColumn(4).width = 20;

  // Title
  ws.mergeCells('A1:D1');
  const t = ws.getCell('A1');
  t.value = `📋  INSTRUCCIONES DE USO — ${config.label.toUpperCase()}`;
  styleCell(t, { bold: true, size: 13, fg: C.WHITE, bg: C.BRAND_DARK, alignH: 'center' });
  ws.getRow(1).height = 32;

  ws.mergeCells('A2:D2');
  const sub = ws.getCell('A2');
  sub.value = 'Sigue estos pasos para importar tus datos correctamente';
  styleCell(sub, { italic: true, size: 10, fg: C.ROSA, bg: C.BRAND_MID, alignH: 'center' });
  ws.getRow(2).height = 20;

  // Spacer
  ws.mergeCells('A3:D3');
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ROSA } } as ExcelJS.FillPattern;
  ws.getRow(3).height = 5;

  // Column headers
  const headers = ['#', 'Paso', 'Descripción', 'Ejemplo'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = h;
    styleCell(cell, { bold: true, size: 10, fg: C.WHITE, bg: C.BRAND_DARK, alignH: 'center', borderColor: C.BRAND_DARK });
  });
  ws.getRow(4).height = 22;

  // Steps
  const steps = [
    ['01', 'Ir a la hoja "DATOS"',         'Haz clic en la pestaña "DATOS" en la parte inferior de este archivo',                     '→ Pestaña DATOS'],
    ['02', 'Revisar las columnas',          'La fila 4 muestra el nombre de cada campo. Los marcados "REQUERIDO" en verde son obligatorios', 'nombre, categoria_id...'],
    ['03', 'Ingresar datos desde la fila 9','No modifiques las filas 1–8 (son encabezados). La fila 8 es solo un ejemplo de referencia',    'Escribe desde A9'],
    ['04', 'Formato de textos',             'Escribe el texto sin comillas. Evita caracteres especiales al inicio de la celda',              'Anillo de Oro 18k'],
    ['05', 'Formato de números',            'Usa punto (.) para decimales, no coma. No incluyas símbolo de moneda',                          '2500.00  (no $2,500)'],
    ['06', 'Formato de fechas',             'Usa el formato ISO: YYYY-MM-DD',                                                                '2025-12-31'],
    ['07', 'Valores booleanos',             'Para campos de Sí/No escribe exactamente: TRUE o FALSE (en mayúsculas)',                        'TRUE  /  FALSE'],
    ['08', 'IDs de relaciones',             'Para campos *_id revisa la hoja "Catálogos" o consulta el sistema para obtener IDs válidos',    'categoria_id: 1'],
    ['09', 'Guardar como CSV',              'Cuando termines ve a Archivo → Guardar como → CSV UTF-8 (delimitado por comas)',                 'archivo.csv'],
    ['10', 'Subir en el sistema',           'En el panel de Importación, selecciona la tabla correcta y sube tu archivo CSV',               'Sección: Importación'],
  ];

  steps.forEach(([num, paso, desc, ej], idx) => {
    const row = idx + 5;
    const bg = idx % 2 === 0 ? C.WHITE : C.ROSA_SUAVE;

    const numCell = ws.getCell(row, 1);
    numCell.value = num;
    styleCell(numCell, { bold: true, size: 10, fg: C.WHITE, bg: C.ROSA, alignH: 'center', borderColor: C.GRAY_MED });

    const pasoCell = ws.getCell(row, 2);
    pasoCell.value = paso;
    styleCell(pasoCell, { bold: true, size: 10, fg: C.BRAND_DARK, bg, borderColor: C.GRAY_MED });

    const descCell = ws.getCell(row, 3);
    descCell.value = desc;
    styleCell(descCell, { size: 10, fg: C.TEXT_DARK, bg, wrap: true, borderColor: C.GRAY_MED });

    const ejCell = ws.getCell(row, 4);
    ejCell.value = ej;
    styleCell(ejCell, { italic: true, size: 9, fg: 'FF4E342E', bg: C.EX_BG, borderColor: C.GRAY_MED });

    ws.getRow(row).height = 22;
  });

  // Tips section
  const tipRow = steps.length + 6;
  ws.mergeCells(tipRow, 1, tipRow, 4);
  const tipHeader = ws.getCell(tipRow, 1);
  tipHeader.value = '⚠️  ERRORES COMUNES — CÓMO EVITARLOS';
  styleCell(tipHeader, { bold: true, size: 11, fg: C.WHITE, bg: 'FFCC6600', alignH: 'center' });
  ws.getRow(tipRow).height = 24;

  const tips = [
    ['❌ Error',        'Descripción',                                         'Solución'],
    ['Campo requerido', 'Dejaste vacío un campo marcado como REQUERIDO',      'Llena todos los campos en verde antes de importar'],
    ['ID inválido',     'Usaste un ID que no existe en el sistema',            'Consulta la hoja "Catálogos" para ver IDs válidos'],
    ['Formato decimal', 'Escribiste "1,500" en lugar de "1500.00"',            'Usa punto como separador decimal'],
    ['Columna extra',   'Agregaste o renombraste columnas del encabezado',     'Restaura los nombres de la fila 4 tal como están'],
    ['Archivo vacío',   'El CSV no tiene datos o tiene formato incorrecto',    'Asegúrate de guardar como "CSV UTF-8"'],
  ];

  tips.forEach(([err, desc, sol], idx) => {
    const r = tipRow + 1 + idx;
    const isTipHeader = idx === 0;
    const bg = isTipHeader ? C.BRAND_MID : (idx % 2 === 0 ? C.WHITE : 'FFFFF3E0');
    const fg = isTipHeader ? C.WHITE : C.TEXT_DARK;

    [err, desc, sol].forEach((val, ci) => {
      const cell = ws.getCell(r, ci + 1);
      cell.value = val;
      if (ci === 0) {
        styleCell(cell, { bold: true, size: 10, fg, bg, borderColor: C.GRAY_MED });
      } else {
        styleCell(cell, { size: 9, fg, bg, wrap: true, borderColor: C.GRAY_MED });
      }
    });
    // merge col 4
    const last = ws.getCell(r, 4);
    styleCell(last, { size: 9, fg, bg, borderColor: C.GRAY_MED });

    ws.getRow(r).height = isTipHeader ? 20 : 22;
  });
}

// ─────────────────────────────────────────────
//  HOJA 3: CATÁLOGOS (relaciones)
// ─────────────────────────────────────────────
async function buildCatalogosSheet(
  wb: ExcelJS.Workbook,
  config: TemplateConfig,
  relaciones: { [key: string]: Array<{ id: number; nombre: string }> }
) {
  if (!config.relaciones || Object.keys(relaciones).length === 0) return;

  const ws = wb.addWorksheet('CATÁLOGOS', {
    properties: { tabColor: { argb: 'FF2196F3' } },
  });

  // Title
  ws.mergeCells('A1:F1');
  const t = ws.getCell('A1');
  t.value = '🔗  CATÁLOGOS DE REFERENCIA — IDs válidos para campos relacionales';
  styleCell(t, { bold: true, size: 12, fg: C.WHITE, bg: C.BRAND_DARK, alignH: 'center' });
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:F2');
  const sub = ws.getCell('A2');
  sub.value = 'Usa los IDs de esta hoja para llenar los campos *_id en la hoja DATOS';
  styleCell(sub, { italic: true, size: 9, fg: C.ROSA, bg: C.BRAND_MID, alignH: 'center' });
  ws.getRow(2).height = 18;

  ws.mergeCells('A3:F3');
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ROSA } } as ExcelJS.FillPattern;
  ws.getRow(3).height = 5;

  let startCol = 1;

  for (const [tabla, rows] of Object.entries(relaciones)) {
    // Table header spans 2 columns
    const headerRow = 4;
    const cell1 = ws.getCell(headerRow, startCol);
    const cell2 = ws.getCell(headerRow, startCol + 1);
    ws.mergeCells(headerRow, startCol, headerRow, startCol + 1);
    cell1.value = `📋 ${tabla.toUpperCase()}`;
    styleCell(cell1, { bold: true, size: 10, fg: C.WHITE, bg: C.BRAND_ACCENT, alignH: 'center', borderColor: C.BRAND_DARK });
    ws.getRow(headerRow).height = 22;

    // Sub-headers
    const sh1 = ws.getCell(5, startCol);
    sh1.value = 'ID';
    styleCell(sh1, { bold: true, size: 9, fg: C.TEXT_DARK, bg: C.ROSA_MED, alignH: 'center', borderColor: C.GRAY_MED });
    const sh2 = ws.getCell(5, startCol + 1);
    sh2.value = 'Nombre';
    styleCell(sh2, { bold: true, size: 9, fg: C.TEXT_DARK, bg: C.ROSA_MED, alignH: 'center', borderColor: C.GRAY_MED });
    ws.getRow(5).height = 18;

    // Data rows
    rows.forEach((row, idx) => {
      const r = idx + 6;
      const bg = idx % 2 === 0 ? C.WHITE : C.ROSA_SUAVE;

      const idCell = ws.getCell(r, startCol);
      idCell.value = row.id;
      styleCell(idCell, { bold: true, size: 10, fg: C.BRAND_DARK, bg, alignH: 'center', borderColor: C.GRAY_MED });

      const nameCell = ws.getCell(r, startCol + 1);
      nameCell.value = row.nombre;
      styleCell(nameCell, { size: 10, fg: C.TEXT_DARK, bg, borderColor: C.GRAY_MED });

      ws.getRow(r).height = 18;
    });

    ws.getColumn(startCol).width = 8;
    ws.getColumn(startCol + 1).width = 32;

    startCol += 3; // leave a gap column between tables
  }
}

// ─────────────────────────────────────────────
//  CONTROLADOR
// ─────────────────────────────────────────────
export const templateController = {

  async downloadTemplate(req: AuthRequest, res: Response) {
    try {
      const { tableName } = req.params;

      if (!TEMPLATE_CONFIG[tableName]) {
        return res.status(404).json({
          success: false,
          message: `No hay plantilla disponible para "${tableName}"`,
        });
      }

      const config = TEMPLATE_CONFIG[tableName];

      // Load relaciones from DB
      const relaciones: { [key: string]: Array<{ id: number; nombre: string }> } = {};
      if (config.relaciones) {
        for (const [campo, query] of Object.entries(config.relaciones)) {
          try {
            const result = await pool.query(query);
            relaciones[campo] = result.rows;
          } catch (error) {
            console.error(`Error loading relation ${campo}:`, error);
            relaciones[campo] = [];
          }
        }
      }

      const wb = new ExcelJS.Workbook();
      wb.creator = 'Joyería Diana Laura';
      wb.lastModifiedBy = 'Sistema de Importación';
      wb.created = new Date();
      wb.modified = new Date();

      buildDatosSheet(wb, tableName, config);
      buildInstruccionesSheet(wb, config);
      await buildCatalogosSheet(wb, config, relaciones);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=plantilla_${tableName}_${Date.now()}.xlsx`
      );

      await wb.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ success: false, message: 'Error al generar la plantilla' });
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
            console.error(`Error loading relation ${campo}:`, error);
            relaciones[campo] = [];
          }
        }
      }

      res.json({
        success: true,
        data: {
          label: config.label,
          icon: config.icon,
          columnas: config.columnas,
          relaciones,
        },
      });

    } catch (error) {
      console.error('Error getting template info:', error);
      res.status(500).json({ success: false, message: 'Error al obtener información de la plantilla' });
    }
  },
};