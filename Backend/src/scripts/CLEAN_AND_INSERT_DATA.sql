-- ==========================================
-- LIMPIAR DATOS DUPLICADOS Y REINSERTAR
-- ==========================================
-- Ejecuta esto en pgAdmin para limpiar duplicados

-- 1. PRIMERO: Limpiar las tablas dependientes (sin errores de clave foránea)
TRUNCATE TABLE productos CASCADE;
TRUNCATE TABLE categorias CASCADE;
TRUNCATE TABLE proveedores CASCADE;
TRUNCATE TABLE temporadas CASCADE;
TRUNCATE TABLE tipos_producto CASCADE;
TRUNCATE TABLE metodos_pago CASCADE;

-- 2. INSERTAR PROVEEDORES (Jewelry Suppliers)
INSERT INTO proveedores (nombre, razon_social, rfc, direccion, telefono, email, sitio_web, persona_contacto, notas, activo, creado_por, fecha_creacion)
VALUES
('Joyas Colombianas SAS', 'Joyas Colombianas SAS', 'JS-2024-001', 'Carrera 7 #45-89, Bogotá DC', '+57 1 234 5678', 'contacto@joyascolombianas.com', 'www.joyascolombianas.com', 'María García', 'Proveedor principal de oro 18K', true, 1, CURRENT_TIMESTAMP),
('Diamantes & Luxury', 'Diamantes & Luxury Ltd', 'DL-2024-002', 'Avenida Paseo Colón 123, Medellín', '+57 4 567 8901', 'ventas@diamantesluxury.com', 'www.diamantesluxury.com', 'Carlos Rodríguez', 'Especialista en diamantes certificados', true, 1, CURRENT_TIMESTAMP),
('Plata Pura Designs', 'Plata Pura Designs Ltda', 'PP-2024-003', 'Calle 8 #12-45, Cali', '+57 2 789 0123', 'info@platapuradesigns.com', 'www.platapuradesigns.com', 'Daniela López', 'Piezas de plata 925 personalizadas', true, 1, CURRENT_TIMESTAMP),
('Accesorios Finos Int', 'Accesorios Finos Internacional', 'AFI-2024-004', 'Paseo Peatonal, Santa Marta', '+57 5 234 5678', 'export@accesoriosfinos.com', 'www.accesoriosfinos.com', 'Antonio Martínez', 'Importador de bisutería premium', true, 1, CURRENT_TIMESTAMP),
('Relojería del Caribe', 'Relojería del Caribe & CIA', 'RC-2024-005', 'Centro Comercial Atlantis, Cartagena', '+57 5 567 8901', 'contacto@relojeriacaribe.com', 'www.relojeriacaribe.com', 'Fátima Sánchez', 'Relojes de lujo y accesorios', true, 1, CURRENT_TIMESTAMP);

-- 3. INSERTAR TEMPORADAS (Seasons 2026)
INSERT INTO temporadas (nombre, descripcion, fecha_inicio, fecha_fin, imagen_url, activo, creado_por, fecha_creacion)
VALUES
('Colección Primavera 2026', 'Nuevos diseños inspirados en la naturaleza', '2026-03-01', '2026-05-31', 'https://via.placeholder.com/300x200?text=Primavera', true, 1, CURRENT_TIMESTAMP),
('Colección Verano 2026', 'Joyas brillantes y ligeras para el calor', '2026-06-01', '2026-08-31', 'https://via.placeholder.com/300x200?text=Verano', true, 1, CURRENT_TIMESTAMP),
('Colección Otoño 2026', 'Tonos cálidos y elegantes', '2026-09-01', '2026-11-30', 'https://via.placeholder.com/300x200?text=Otoño', true, 1, CURRENT_TIMESTAMP),
('Colección Invierno 2026', 'Piezas sofisticadas y atemporales', '2026-12-01', '2026-12-31', 'https://via.placeholder.com/300x200?text=Invierno', true, 1, CURRENT_TIMESTAMP),
('Colección Especial San Valentín', 'Románticas y exclusivas', '2026-01-15', '2026-02-28', 'https://via.placeholder.com/300x200?text=San+Valentin', true, 1, CURRENT_TIMESTAMP);

-- 4. INSERTAR TIPOS DE PRODUCTO
INSERT INTO tipos_producto (nombre, descripcion, activo, creado_por, fecha_creacion)
VALUES
('Joyas Finas', 'Joyas fabricadas con oro, plata, platino y diamantes', true, 1, CURRENT_TIMESTAMP),
('Bisutería', 'Piezas de fantasía y accesorios variados', true, 1, CURRENT_TIMESTAMP),
('Accesorios', 'Complementos como pulseras, tobilleras, anillos en diversos materiales', true, 1, CURRENT_TIMESTAMP),
('Joyas Personalizadas', 'Piezas hechas a medida con diseños únicos', true, 1, CURRENT_TIMESTAMP),
('Relojería', 'Relojes de pulsera y accesorios relacionados', true, 1, CURRENT_TIMESTAMP);

-- 5. INSERTAR CATEGORÍAS (con jerarquía)
INSERT INTO categorias (nombre, descripcion, categoria_padre_id, imagen_url, orden, activo, creado_por, fecha_creacion, fecha_actualizacion)
VALUES
-- Categorías principales
('Anillos', 'Todos nuestros anillos y sortijas', NULL, 'https://via.placeholder.com/300x200?text=Anillos', 1, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Pulseras', 'Pulseras y brazaletes en diversos estilos', NULL, 'https://via.placeholder.com/300x200?text=Pulseras', 2, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Collares', 'Collares, cadenas y colgantes', NULL, 'https://via.placeholder.com/300x200?text=Collares', 3, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Aretes', 'Aretes, pendientes y aros para oreja', NULL, 'https://via.placeholder.com/300x200?text=Aretes', 4, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Relojes', 'Relojes de pulsera y relojería fina', NULL, 'https://via.placeholder.com/300x200?text=Relojes', 5, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 6. LIMPIAR Y REINSERTAR MÉTODOS DE PAGO (SIN DUPLICADOS)
DELETE FROM metodos_pago;
INSERT INTO metodos_pago (nombre, codigo, descripcion, activo, created_at)
VALUES
('Transferencia Bancaria', 'transferencia', 'Transferencia bancaria nacional e internacional', true, CURRENT_TIMESTAMP),
('Tarjeta de Crédito', 'tarjeta_credito', 'Visa, MasterCard, American Express', true, CURRENT_TIMESTAMP),
('Efectivo', 'efectivo', 'Pago en efectivo en tienda', true, CURRENT_TIMESTAMP),
('Regalo o Crédito', 'regalo', 'Compra como regalo o crédito', true, CURRENT_TIMESTAMP),
('Cheque', 'cheque', 'Pago con cheque certificado', true, CURRENT_TIMESTAMP);

-- 7. VERIFICACIÓN FINAL
SELECT 'Proveedores' as tabla, COUNT(*) as cantidad FROM proveedores
UNION ALL
SELECT 'Temporadas', COUNT(*) FROM temporadas
UNION ALL
SELECT 'Tipos Producto', COUNT(*) FROM tipos_producto
UNION ALL
SELECT 'Categorías', COUNT(*) FROM categorias
UNION ALL
SELECT 'Métodos Pago', COUNT(*) FROM metodos_pago
UNION ALL
SELECT 'Productos', COUNT(*) FROM productos;
