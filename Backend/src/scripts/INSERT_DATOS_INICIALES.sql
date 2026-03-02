-- =====================================================
-- SCRIPT DE INSERCIÓN DE DATOS INICIALES
-- Para ejecutar en pgAdmin
-- =====================================================

BEGIN;

-- =====================================================
-- 1. INSERTAR PROVEEDORES (FABRICANTES)
-- =====================================================
INSERT INTO proveedores (nombre, razon_social, rfc, direccion, telefono, email, sitio_web, persona_contacto, notas, activo, creado_por, fecha_creacion, fecha_actualizacion) VALUES
('Joyería Gold Masters', 'GOLD MASTERS SA DE CV', 'GMM123456AB0', 'Av. Principal 123, México DF', '5551234567', 'contacto@goldmasters.mx', 'www.goldmasters.mx', 'Carlos García', 'Proveedor principal de oro', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Diseños Premium Plata', 'PREMIUM PLATA SRL', 'PPL987654CD1', 'Calle Secundaria 456, CDMX', '5559876543', 'info@premiumpalta.mx', 'www.premiumplata.mx', 'Ana López', 'Especialista en piezas de plata', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Accesorios Brillantes', 'BRILLANTES ACCESORIOS SA', 'BAC456789EF2', 'Blvd Central 789, Guadalajara', '3331234567', 'ventas@brillantes.mx', 'www.brillantes.mx', 'Fernando Rodríguez', 'Accesorios y bisutería', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Metales Preciosos XYZ', 'METALES XYZ LTDA', 'MXY111222GH3', 'Zona Industrial 321, Monterrey', '8181234567', 'admin@metalesxyz.mx', 'www.metalesxyz.mx', 'Javier Méndez', 'Materias primas para joyería', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Cristales y Gemas', 'CRISGEMAS SA CV', 'CGE333444IJ4', 'Centro Histórico 555, Veracruz', '2291234567', 'contacto@crisgemas.mx', 'www.crisgemas.mx', 'María González', 'Piedras preciosas y cristales', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- =====================================================
-- 2. INSERTAR TEMPORADAS
-- =====================================================
INSERT INTO temporadas (nombre, descripcion, fecha_inicio, fecha_fin, imagen_url, activo, creado_por, fecha_creacion, fecha_actualizacion) VALUES
('Primavera 2026', 'Colección de primavera con diseños frescos y flores', '2026-03-01', '2026-05-31', 'https://example.com/primavera2026.jpg', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Verano 2026', 'Colección de verano con toques dorados y brillantes', '2026-06-01', '2026-08-31', 'https://example.com/verano2026.jpg', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Otoño 2026', 'Colección de otoño con tonos cálidos', '2026-09-01', '2026-11-30', 'https://example.com/otono2026.jpg', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Invierno 2026', 'Colección de invierno elegante y sofisticada', '2026-12-01', '2027-02-28', 'https://example.com/invierno2026.jpg', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Navidad 2026', 'Colección especial navideña con acabados brillantes', '2026-11-15', '2026-12-31', 'https://example.com/navidad2026.jpg', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- =====================================================
-- 3. INSERTAR TIPOS DE PRODUCTO
-- =====================================================
INSERT INTO tipos_producto (nombre, descripcion, activo, creado_por, fecha_creacion) VALUES
('Joyería Fina', 'Oro, plata y metales preciosos auténticos', true, 1, CURRENT_TIMESTAMP),
('Bisutería', 'Acero quirúrgico y materiales alternativos', true, 1, CURRENT_TIMESTAMP),
('Accesorios de Moda', 'Piezas decorativas y trendy', true, 1, CURRENT_TIMESTAMP),
('Joyería Personalizada', 'Piezas hechas a medida según especificaciones', true, 1, CURRENT_TIMESTAMP),
('Relojería', 'Relojes de pulsera y complementos', true, 1, CURRENT_TIMESTAMP);

-- =====================================================
-- 4. INSERTAR MÉTODOS DE PAGO (complemento)
-- =====================================================
INSERT INTO metodos_pago (nombre, codigo, tipo, descripcion, orden, activo, creado_por, fecha_creacion, fecha_actualizacion) VALUES
('Tarjeta de Crédito', 'tarjeta_credito', 'tarjeta', 'Visa, Mastercard, American Express', 1, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Tarjeta de Débito', 'tarjeta_debito', 'tarjeta', 'Tarjeta de débito de cualquier banco', 2, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('PayPal', 'paypal', 'billetera_digital', 'Pago seguro mediante PayPal', 3, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Transferencia Bancaria', 'transferencia', 'transferencia', 'Depósito directo a cuenta bancaria', 4, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Efectivo en Tienda', 'efectivo', 'efectivo', 'Pago al recoger en tienda', 5, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;

-- =====================================================
-- VERIFICACIÓN DE INSERCIONES
-- =====================================================
-- Descomenta para verificar los datos insertados:
/*
SELECT * FROM proveedores;
SELECT * FROM temporadas;
SELECT * FROM tipos_producto;
SELECT * FROM metodos_pago;
*/
