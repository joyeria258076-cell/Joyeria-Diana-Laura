-- =====================================================
-- BASE DE DATOS COMPLETA - JOYERÍA DIANA LAURA
-- Versión: Final Optimizada en Español
-- Normalización: 3FN con Desnormalización Estratégica
-- =====================================================

BEGIN;

-- =====================================================
-- TIPOS ENUMERADOS
-- =====================================================

-- Módulo Usuario (mantener en inglés)
CREATE TYPE rol_enum AS ENUM ('cliente', 'gestor_ventas', 'gestor_pedidos', 'admin');
CREATE TYPE estado_pago_enum AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');

-- Demás módulos en español
CREATE TYPE estado_pedido_enum AS ENUM ('pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado');
CREATE TYPE tipo_movimiento_enum AS ENUM ('entrada_compra', 'salida_venta', 'ajuste', 'devolucion', 'merma');
CREATE TYPE genero_producto_enum AS ENUM ('unisex', 'dama', 'caballero', 'nino', 'nina');
CREATE TYPE tipo_descuento_enum AS ENUM ('porcentaje', 'monto_fijo', 'envio_gratis');
CREATE TYPE tipo_medida_enum AS ENUM ('cm', 'mm', 'gramos', 'onzas', 'talla');

-- =====================================================
-- MÓDULO: USUARIOS Y SEGURIDAD (SIN CAMBIOS - INTACTO)
-- =====================================================

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    rol rol_enum DEFAULT 'cliente',
    activo BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(100),
    mfa_backup_codes TEXT[],
    mfa_verified BOOLEAN DEFAULT false,
    mfa_setup_token VARCHAR(255),
    mfa_setup_token_expires TIMESTAMP,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    recovery_attempts INTEGER DEFAULT 0,
    last_recovery_attempt TIMESTAMP,
    recovery_blocked_until TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mfa_backup_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    usado BOOLEAN DEFAULT false,
    usado_en TIMESTAMP,
    usado_desde_ip VARCHAR(45),
    usado_desde_dispositivo VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days')
);

CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    device_fingerprint VARCHAR(16),
    firebase_uid VARCHAR(255),
    device_name VARCHAR(255),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP
);

CREATE TABLE login_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE login_security (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    email VARCHAR(255) UNIQUE NOT NULL,
    login_attempts INTEGER DEFAULT 0,
    last_login_attempt TIMESTAMP,
    login_blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE security_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    question_text VARCHAR(500) NOT NULL,
    answer_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: CMS (PÁGINAS WEB)
-- =====================================================

CREATE TABLE paginas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    descripcion TEXT,
    icono VARCHAR(100),
    orden INTEGER DEFAULT 0,
    mostrar_en_menu BOOLEAN DEFAULT true,
    mostrar_en_footer BOOLEAN DEFAULT false,
    requiere_autenticacion BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER,
    actualizado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE secciones (
    id SERIAL PRIMARY KEY,
    pagina_id INTEGER NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    imagen_url VARCHAR(500),
    color_fondo VARCHAR(20),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contenidos (
    id SERIAL PRIMARY KEY,
    seccion_id INTEGER NOT NULL,
    titulo VARCHAR(300),
    descripcion TEXT,
    imagen_url VARCHAR(500),
    enlace_url VARCHAR(500),
    enlace_nueva_ventana BOOLEAN DEFAULT false,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: PROVEEDORES (FABRICANTES)
-- =====================================================

CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    razon_social VARCHAR(300),
    rfc VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(255),
    sitio_web VARCHAR(300),
    persona_contacto VARCHAR(200),
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: CATÁLOGOS BASE
-- =====================================================

CREATE TABLE temporadas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    imagen_url VARCHAR(500),
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(300),
    categoria_padre_id INTEGER,
    imagen_url VARCHAR(500),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipos_producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(300),
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: PRODUCTOS (3FN → DESNORMALIZADO)
-- =====================================================

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    -- Relaciones normalizadas
    categoria_id INTEGER NOT NULL,
    proveedor_id INTEGER,
    temporada_id INTEGER,
    tipo_producto_id INTEGER,
    -- ⭐ Campos desnormalizados (para evitar JOINs frecuentes)
    categoria_nombre VARCHAR(100),
    proveedor_nombre VARCHAR(100),
    -- Clasificación
    genero genero_producto_enum DEFAULT 'unisex',
    -- Materiales y composición
    material_principal VARCHAR(100),
    materiales_detalle JSONB,
    peso_gramos DECIMAL(10, 3),
    -- Precios y costos
    precio_compra DECIMAL(10, 2),
    margen_ganancia DECIMAL(5, 2),
    precio_venta DECIMAL(10, 2),
    precio_oferta DECIMAL(10, 2),
    -- Inventario
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    stock_maximo INTEGER DEFAULT 999,
    ubicacion_fisica VARCHAR(100),
    -- Medidas
    tiene_medidas BOOLEAN DEFAULT false,
    medidas JSONB,
    -- Personalización
    permite_personalizacion BOOLEAN DEFAULT false,
    dias_fabricacion INTEGER DEFAULT 0,
    -- Imágenes
    imagen_principal VARCHAR(500),
    -- Estados
    es_nuevo BOOLEAN DEFAULT false,
    es_destacado BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    -- Auditoría
    creado_por INTEGER,
    actualizado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE imagenes_producto (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL,
    url_imagen VARCHAR(500) NOT NULL,
    alt_texto VARCHAR(200),
    es_principal BOOLEAN DEFAULT false,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true
);

CREATE TABLE atributos_personalizacion (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    opciones TEXT,
    precio_adicional DECIMAL(10, 2) DEFAULT 0.00,
    es_requerido BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true
);

-- =====================================================
-- MÓDULO: CLIENTES
-- =====================================================

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    nombre VARCHAR(200) NOT NULL,
    apellido VARCHAR(200),
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    celular VARCHAR(20),
    fecha_nacimiento DATE,
    imagen_perfil VARCHAR(500),
    notas_internas TEXT,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE direcciones_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    alias VARCHAR(100),
    nombre_destinatario VARCHAR(200) NOT NULL,
    telefono_contacto VARCHAR(20),
    calle VARCHAR(200) NOT NULL,
    numero_exterior VARCHAR(20),
    numero_interior VARCHAR(20),
    colonia VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10) NOT NULL,
    referencias TEXT,
    -- Geolocalización (para API de mapas)
    latitud DECIMAL(10, 7),
    longitud DECIMAL(10, 7),
    es_predeterminada BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: PROMOCIONES Y DESCUENTOS
-- =====================================================

CREATE TABLE promociones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    codigo_cupon VARCHAR(50) UNIQUE,
    descripcion TEXT,
    tipo tipo_descuento_enum NOT NULL,
    valor_descuento DECIMAL(10, 2) NOT NULL,
    -- Aplicabilidad (3FN: arrays de IDs)
    aplica_categorias INTEGER[],
    aplica_proveedores INTEGER[],
    aplica_temporadas INTEGER[],
    aplica_productos INTEGER[],
    aplica_genero genero_producto_enum,
    aplica_tipos_producto INTEGER[],
    -- Restricciones
    monto_minimo_compra DECIMAL(10, 2),
    cantidad_minima_productos INTEGER,
    limite_usos_total INTEGER,
    usos_actuales INTEGER DEFAULT 0,
    limite_usos_por_cliente INTEGER DEFAULT 1,
    -- Vigencia
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    activo BOOLEAN DEFAULT true,
    -- Auditoría
    creado_por INTEGER NOT NULL,
    actualizado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE historial_promociones (
    id SERIAL PRIMARY KEY,
    promocion_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    venta_id INTEGER,
    descuento_aplicado DECIMAL(10, 2) NOT NULL,
    fecha_uso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(promocion_id, cliente_id, venta_id)
);

-- =====================================================
-- MÓDULO: MÉTODOS DE PAGO Y PASARELAS
-- =====================================================

CREATE TABLE metodos_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL,
    icono_url VARCHAR(500),
    -- Configuración pasarela
    es_pasarela BOOLEAN DEFAULT false,
    nombre_pasarela VARCHAR(100),
    api_public_key VARCHAR(500),
    api_secret_key_encrypted TEXT,
    modo VARCHAR(20) DEFAULT 'production',
    genera_referencia_pago BOOLEAN DEFAULT false,
    -- Comisiones
    comision_porcentaje DECIMAL(5, 2) DEFAULT 0.00,
    comision_fija DECIMAL(10, 2) DEFAULT 0.00,
    -- Instrucciones
    instrucciones_cliente TEXT,
    instrucciones_admin TEXT,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    -- Auditoría
    creado_por INTEGER,
    actualizado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: COMPRAS A PROVEEDORES
-- =====================================================

CREATE TABLE compras (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL,
    proveedor_id INTEGER NOT NULL,
    -- Snapshot del proveedor
    proveedor_nombre VARCHAR(200) NOT NULL,
    proveedor_contacto VARCHAR(200),
    -- Totales
    subtotal DECIMAL(10, 2) NOT NULL,
    iva DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    -- Documentación
    factura VARCHAR(100),
    nota_remision VARCHAR(100),
    notas TEXT,
    fecha_compra DATE NOT NULL,
    fecha_recepcion DATE,
    estado VARCHAR(50) DEFAULT 'pendiente',
    -- Auditoría
    creado_por INTEGER NOT NULL,
    actualizado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_compras (
    id SERIAL PRIMARY KEY,
    compra_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    -- Snapshot del producto
    producto_codigo VARCHAR(50) NOT NULL,
    producto_nombre VARCHAR(200) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: VENTAS (PEDIDOS)
-- =====================================================

CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL,
    cliente_id INTEGER NOT NULL,
    direccion_entrega_id INTEGER,
    metodo_pago_id INTEGER NOT NULL,
    promocion_id INTEGER,
    estado estado_pedido_enum DEFAULT 'pendiente',
    -- Snapshot del cliente
    cliente_nombre_completo VARCHAR(400) NOT NULL,
    cliente_email VARCHAR(255) NOT NULL,
    cliente_telefono VARCHAR(20),
    -- Totales (desnormalizado para reportes rápidos)
    total_articulos INTEGER DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL,
    descuento DECIMAL(10, 2) DEFAULT 0.00,
    iva DECIMAL(10, 2) NOT NULL,
    costo_envio DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    -- Notas
    notas_cliente TEXT,
    notas_internas TEXT,
    -- Envío
    numero_guia VARCHAR(100),
    paqueteria VARCHAR(100),
    fecha_estimada_entrega DATE,
    -- Cancelación
    fecha_cancelacion TIMESTAMP,
    cancelado_por INTEGER,
    motivo_cancelacion TEXT,
    -- Auditoría
    creado_por INTEGER,
    actualizado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_ventas (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    -- Snapshot del producto (histórico)
    producto_codigo VARCHAR(50) NOT NULL,
    producto_nombre VARCHAR(200) NOT NULL,
    producto_imagen VARCHAR(500),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL,
    descuento_unitario DECIMAL(10, 2) DEFAULT 0.00,
    personalizacion JSONB,
    subtotal DECIMAL(10, 2) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE historial_estado_venta (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL,
    estado_anterior estado_pedido_enum,
    estado_nuevo estado_pedido_enum NOT NULL,
    comentario TEXT,
    notificar_cliente BOOLEAN DEFAULT true,
    modificado_por INTEGER,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: TRANSACCIONES DE PAGO (PASARELAS)
-- =====================================================

CREATE TABLE transacciones_pago (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL,
    metodo_pago_id INTEGER NOT NULL,
    -- IDs de pasarelas externas
    transaction_id VARCHAR(200) UNIQUE,
    referencia_pago VARCHAR(200),
    payment_intent_id VARCHAR(200),
    -- Montos
    monto DECIMAL(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    comision DECIMAL(10, 2) DEFAULT 0.00,
    monto_neto DECIMAL(10, 2) NOT NULL,
    -- Estado
    estado estado_pago_enum DEFAULT 'pendiente',
    estado_pasarela VARCHAR(50),
    -- Detalles del pago
    metodo_especifico VARCHAR(50),
    ultimos_4_digitos VARCHAR(4),
    banco VARCHAR(100),
    nombre_titular VARCHAR(200),
    -- Tiempos
    fecha_expiracion_referencia TIMESTAMP,
    fecha_procesamiento TIMESTAMP,
    fecha_aprobacion TIMESTAMP,
    fecha_reembolso TIMESTAMP,
    -- Respuestas
    respuesta_completa JSONB,
    mensaje_error TEXT,
    codigo_error VARCHAR(100),
    -- Metadata
    ip_cliente VARCHAR(45),
    user_agent TEXT,
    -- Auditoría
    procesado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webhooks_pasarela (
    id SERIAL PRIMARY KEY,
    metodo_pago_id INTEGER,
    transaction_id VARCHAR(200),
    tipo_evento VARCHAR(100) NOT NULL,
    payload_completo JSONB NOT NULL,
    headers JSONB,
    procesado BOOLEAN DEFAULT false,
    procesado_por INTEGER,
    fecha_procesamiento TIMESTAMP,
    ip_origen VARCHAR(45),
    fecha_recepcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: INVENTARIO
-- =====================================================

CREATE TABLE movimientos_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL,
    tipo_movimiento tipo_movimiento_enum NOT NULL,
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    -- Costos (para valorización)
    costo_unitario DECIMAL(10, 2),
    costo_total DECIMAL(10, 2),
    -- Referencias
    compra_id INTEGER,
    venta_id INTEGER,
    proveedor VARCHAR(200),
    numero_factura VARCHAR(100),
    -- Justificación
    motivo TEXT,
    observaciones TEXT,
    -- Auditoría
    realizado_por INTEGER NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alertas_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL,
    tipo_alerta VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    nivel VARCHAR(20) DEFAULT 'info',
    resuelta BOOLEAN DEFAULT false,
    resuelta_por INTEGER,
    fecha_resolucion TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: NOTIFICACIONES
-- =====================================================

CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER,
    venta_id INTEGER,
    destinatario_email VARCHAR(255),
    destinatario_telefono VARCHAR(20),
    tipo VARCHAR(50) NOT NULL,
    asunto VARCHAR(200),
    mensaje TEXT NOT NULL,
    canal VARCHAR(20) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    intentos INTEGER DEFAULT 0,
    max_intentos INTEGER DEFAULT 3,
    fecha_envio TIMESTAMP,
    mensaje_error TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plantillas_notificacion (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    asunto VARCHAR(200) NOT NULL,
    cuerpo TEXT NOT NULL,
    variables_disponibles TEXT,
    canal VARCHAR(20) NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: CONFIGURACIÓN
-- =====================================================

CREATE TABLE configuracion (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo_dato VARCHAR(50) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100),
    es_sensible BOOLEAN DEFAULT false,
    actualizado_por INTEGER NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE preguntas_frecuentes (
    id SERIAL PRIMARY KEY,
    categoria VARCHAR(100),
    pregunta TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    contador_util INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER,
    actualizado_por INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: AUDITORÍA
-- =====================================================

CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    tabla VARCHAR(100) NOT NULL,
    registro_id INTEGER NOT NULL,
    operacion VARCHAR(20) NOT NULL,
    usuario_id INTEGER,
    usuario_email VARCHAR(255),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fecha_operacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PASO 3: ÍNDICES
-- =====================================================

-- Usuarios (sin cambios)
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);
CREATE INDEX idx_usuarios_firebase_uid ON usuarios(firebase_uid);
CREATE INDEX idx_mfa_backup_user ON mfa_backup_codes(user_id);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX idx_login_security_user ON login_security(user_id);

-- CMS
CREATE INDEX idx_paginas_slug ON paginas(slug);
CREATE INDEX idx_paginas_activo ON paginas(activo) WHERE activo = true;
CREATE INDEX idx_secciones_pagina ON secciones(pagina_id, orden);
CREATE INDEX idx_contenidos_seccion ON contenidos(seccion_id, orden);

-- Catálogos
CREATE INDEX idx_proveedores_activo ON proveedores(activo);
CREATE INDEX idx_temporadas_vigentes ON temporadas(fecha_inicio, fecha_fin) WHERE activo = true;
CREATE INDEX idx_categorias_padre ON categorias(categoria_padre_id);
CREATE INDEX idx_categorias_activo ON categorias(activo);
CREATE INDEX idx_tipos_producto_activo ON tipos_producto(activo);

-- Productos
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX idx_productos_activo ON productos(activo) WHERE activo = true;
CREATE INDEX idx_productos_destacado ON productos(es_destacado) WHERE es_destacado = true;
CREATE INDEX idx_imagenes_producto ON imagenes_producto(producto_id);
CREATE INDEX idx_atributos_producto ON atributos_personalizacion(producto_id);

-- Clientes
CREATE INDEX idx_clientes_user ON clientes(user_id);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_direcciones_cliente ON direcciones_cliente(cliente_id);

-- Promociones
CREATE INDEX idx_promociones_codigo ON promociones(codigo_cupon);
CREATE INDEX idx_promociones_vigencia ON promociones(fecha_inicio, fecha_fin) WHERE activo = true;
CREATE INDEX idx_historial_promo_cliente ON historial_promociones(cliente_id);

-- Métodos pago
CREATE INDEX idx_metodos_pago_activo ON metodos_pago(activo, orden);

-- Compras
CREATE INDEX idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX idx_compras_fecha ON compras(fecha_compra);
CREATE INDEX idx_detalle_compras ON detalle_compras(compra_id);

-- Ventas
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_ventas_fecha ON ventas(fecha_creacion);
CREATE INDEX idx_ventas_folio ON ventas(folio);
CREATE INDEX idx_detalle_ventas ON detalle_ventas(venta_id);
CREATE INDEX idx_historial_venta ON historial_estado_venta(venta_id);

-- Transacciones
CREATE INDEX idx_transacciones_venta ON transacciones_pago(venta_id);
CREATE INDEX idx_transacciones_estado ON transacciones_pago(estado);
CREATE INDEX idx_webhooks_procesado ON webhooks_pasarela(procesado);

-- Inventario
CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha_movimiento);
CREATE INDEX idx_alertas_inventario ON alertas_inventario(producto_id, resuelta);

-- Auditoría
CREATE INDEX idx_auditoria_tabla ON auditoria(tabla, registro_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha_operacion);

COMMIT;

-- =====================================================
-- Continúa en siguiente bloque...
-- =====================================================

-- =====================================================
-- PASO 4: FOREIGN KEYS
-- =====================================================

BEGIN;

-- Usuarios
ALTER TABLE mfa_backup_codes ADD CONSTRAINT fk_mfa_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE user_sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE security_questions ADD CONSTRAINT fk_security_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE login_attempts ADD CONSTRAINT fk_login_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE login_security ADD CONSTRAINT fk_security_user_id FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;

-- CMS
ALTER TABLE paginas ADD CONSTRAINT fk_paginas_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE paginas ADD CONSTRAINT fk_paginas_actualizado FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE secciones ADD CONSTRAINT fk_secciones_pagina FOREIGN KEY (pagina_id) REFERENCES paginas(id) ON DELETE CASCADE;
ALTER TABLE secciones ADD CONSTRAINT fk_secciones_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE contenidos ADD CONSTRAINT fk_contenidos_seccion FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE;
ALTER TABLE contenidos ADD CONSTRAINT fk_contenidos_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Catálogos
ALTER TABLE proveedores ADD CONSTRAINT fk_proveedores_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE temporadas ADD CONSTRAINT fk_temporadas_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE categorias ADD CONSTRAINT fk_categorias_padre FOREIGN KEY (categoria_padre_id) REFERENCES categorias(id) ON DELETE SET NULL;
ALTER TABLE categorias ADD CONSTRAINT fk_categorias_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE tipos_producto ADD CONSTRAINT fk_tipos_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Productos
ALTER TABLE productos ADD CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id);
ALTER TABLE productos ADD CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;
ALTER TABLE productos ADD CONSTRAINT fk_productos_temporada FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE SET NULL;
ALTER TABLE productos ADD CONSTRAINT fk_productos_tipo FOREIGN KEY (tipo_producto_id) REFERENCES tipos_producto(id) ON DELETE SET NULL;
ALTER TABLE productos ADD CONSTRAINT fk_productos_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE productos ADD CONSTRAINT fk_productos_actualizado FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE imagenes_producto ADD CONSTRAINT fk_imagenes_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;
ALTER TABLE atributos_personalizacion ADD CONSTRAINT fk_atributos_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

-- Clientes
ALTER TABLE clientes ADD CONSTRAINT fk_clientes_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE direcciones_cliente ADD CONSTRAINT fk_direcciones_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

-- Promociones
ALTER TABLE promociones ADD CONSTRAINT fk_promociones_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE promociones ADD CONSTRAINT fk_promociones_actualizado FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE historial_promociones ADD CONSTRAINT fk_historial_promo FOREIGN KEY (promocion_id) REFERENCES promociones(id) ON DELETE CASCADE;
ALTER TABLE historial_promociones ADD CONSTRAINT fk_historial_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
ALTER TABLE historial_promociones ADD CONSTRAINT fk_historial_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL;

-- Métodos pago
ALTER TABLE metodos_pago ADD CONSTRAINT fk_metodos_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE metodos_pago ADD CONSTRAINT fk_metodos_actualizado FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Compras
ALTER TABLE compras ADD CONSTRAINT fk_compras_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);
ALTER TABLE compras ADD CONSTRAINT fk_compras_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE compras ADD CONSTRAINT fk_compras_actualizado FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE detalle_compras ADD CONSTRAINT fk_detalle_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE;
ALTER TABLE detalle_compras ADD CONSTRAINT fk_detalle_compra_producto FOREIGN KEY (producto_id) REFERENCES productos(id);

-- Ventas
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id);
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_direccion FOREIGN KEY (direccion_entrega_id) REFERENCES direcciones_cliente(id);
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_metodo FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id);
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_promocion FOREIGN KEY (promocion_id) REFERENCES promociones(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_cancelado FOREIGN KEY (cancelado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_actualizado FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE detalle_ventas ADD CONSTRAINT fk_detalle_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE;
ALTER TABLE detalle_ventas ADD CONSTRAINT fk_detalle_venta_producto FOREIGN KEY (producto_id) REFERENCES productos(id);
ALTER TABLE historial_estado_venta ADD CONSTRAINT fk_historial_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE;
ALTER TABLE historial_estado_venta ADD CONSTRAINT fk_historial_modificado FOREIGN KEY (modificado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Transacciones
ALTER TABLE transacciones_pago ADD CONSTRAINT fk_transaccion_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE;
ALTER TABLE transacciones_pago ADD CONSTRAINT fk_transaccion_metodo FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id);
ALTER TABLE transacciones_pago ADD CONSTRAINT fk_transaccion_procesado FOREIGN KEY (procesado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE webhooks_pasarela ADD CONSTRAINT fk_webhook_metodo FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id);
ALTER TABLE webhooks_pasarela ADD CONSTRAINT fk_webhook_procesado FOREIGN KEY (procesado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Inventario
ALTER TABLE movimientos_inventario ADD CONSTRAINT fk_movimiento_producto FOREIGN KEY (producto_id) REFERENCES productos(id);
ALTER TABLE movimientos_inventario ADD CONSTRAINT fk_movimiento_compra FOREIGN KEY (compra_id) REFERENCES compras(id);
ALTER TABLE movimientos_inventario ADD CONSTRAINT fk_movimiento_venta FOREIGN KEY (venta_id) REFERENCES ventas(id);
ALTER TABLE movimientos_inventario ADD CONSTRAINT fk_movimiento_usuario FOREIGN KEY (realizado_por) REFERENCES usuarios(id);
ALTER TABLE alertas_inventario ADD CONSTRAINT fk_alerta_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;
ALTER TABLE alertas_inventario ADD CONSTRAINT fk_alerta_resuelta FOREIGN KEY (resuelta_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Notificaciones
ALTER TABLE notificaciones ADD CONSTRAINT fk_notif_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id);
ALTER TABLE notificaciones ADD CONSTRAINT fk_notif_venta FOREIGN KEY (venta_id) REFERENCES ventas(id);

-- Configuración
ALTER TABLE configuracion ADD CONSTRAINT fk_config_actualizado FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);
ALTER TABLE preguntas_frecuentes ADD CONSTRAINT fk_faq_creado FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE preguntas_frecuentes ADD CONSTRAINT fk_faq_actualizado FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Auditoría
ALTER TABLE auditoria ADD CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);

COMMIT;

-- =====================================================
-- PASO 5: TRIGGERS
-- =====================================================

-- Trigger: Actualizar campos desnormalizados en productos
CREATE OR REPLACE FUNCTION actualizar_campos_producto()
RETURNS TRIGGER AS $$
BEGIN
    -- Obtener nombre de categoría
    SELECT nombre INTO NEW.categoria_nombre 
    FROM categorias WHERE id = NEW.categoria_id;
    
    -- Obtener nombre de proveedor
    IF NEW.proveedor_id IS NOT NULL THEN
        SELECT nombre INTO NEW.proveedor_nombre 
        FROM proveedores WHERE id = NEW.proveedor_id;
    END IF;
    
    -- Calcular precio de venta
    IF NEW.precio_compra IS NOT NULL AND NEW.margen_ganancia IS NOT NULL THEN
        NEW.precio_venta := NEW.precio_compra * (1 + NEW.margen_ganancia / 100);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_producto
BEFORE INSERT OR UPDATE ON productos
FOR EACH ROW EXECUTE FUNCTION actualizar_campos_producto();

-- Trigger: Sincronizar nombres desnormalizados cuando cambia categoría
CREATE OR REPLACE FUNCTION sincronizar_categoria_producto()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.nombre != NEW.nombre) THEN
        UPDATE productos 
        SET categoria_nombre = NEW.nombre,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE categoria_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_categoria
AFTER UPDATE ON categorias
FOR EACH ROW EXECUTE FUNCTION sincronizar_categoria_producto();

-- Trigger: Sincronizar proveedor
CREATE OR REPLACE FUNCTION sincronizar_proveedor_producto()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.nombre != NEW.nombre) THEN
        UPDATE productos 
        SET proveedor_nombre = NEW.nombre,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE proveedor_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_proveedor
AFTER UPDATE ON proveedores
FOR EACH ROW EXECUTE FUNCTION sincronizar_proveedor_producto();

-- Trigger: Actualizar stock tras movimiento
CREATE OR REPLACE FUNCTION actualizar_stock_producto()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos 
    SET stock_actual = NEW.stock_nuevo,
        fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = NEW.producto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_stock
AFTER INSERT ON movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION actualizar_stock_producto();

-- Trigger: Crear alertas de stock
CREATE OR REPLACE FUNCTION verificar_stock_productos()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_minimo INTEGER;
    v_nombre_producto VARCHAR(200);
BEGIN
    SELECT stock_minimo, nombre INTO v_stock_minimo, v_nombre_producto
    FROM productos WHERE id = NEW.producto_id;
    
    IF NEW.stock_nuevo <= v_stock_minimo THEN
        INSERT INTO alertas_inventario (producto_id, tipo_alerta, mensaje, nivel)
        VALUES (
            NEW.producto_id,
            CASE WHEN NEW.stock_nuevo = 0 THEN 'sin_stock' ELSE 'stock_bajo' END,
            'El producto ' || v_nombre_producto || ' tiene stock ' || 
            CASE WHEN NEW.stock_nuevo = 0 THEN 'AGOTADO' ELSE 'BAJO (' || NEW.stock_nuevo || ' unidades)' END,
            CASE WHEN NEW.stock_nuevo = 0 THEN 'critical' ELSE 'warning' END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_verificar_stock
AFTER INSERT ON movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION verificar_stock_productos();

-- Trigger: Actualizar total_articulos en ventas
CREATE OR REPLACE FUNCTION actualizar_total_articulos()
RETURNS TRIGGER AS $$
DECLARE
    v_venta_id INTEGER;
    v_total INTEGER;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_venta_id := OLD.venta_id;
    ELSE
        v_venta_id := NEW.venta_id;
    END IF;
    
    SELECT COALESCE(SUM(cantidad), 0) INTO v_total
    FROM detalle_ventas WHERE venta_id = v_venta_id;
    
    UPDATE ventas 
    SET total_articulos = v_total,
        fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = v_venta_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_total_articulos
AFTER INSERT OR UPDATE OR DELETE ON detalle_ventas
FOR EACH ROW EXECUTE FUNCTION actualizar_total_articulos();

-- Trigger: Registrar historial de ventas
CREATE OR REPLACE FUNCTION registrar_historial_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.estado != NEW.estado) THEN
        INSERT INTO historial_estado_venta (venta_id, estado_anterior, estado_nuevo, modificado_por)
        VALUES (NEW.id, OLD.estado, NEW.estado, NEW.actualizado_por);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_historial_venta
AFTER UPDATE ON ventas
FOR EACH ROW EXECUTE FUNCTION registrar_historial_venta();

-- Trigger: Registrar uso de promoción
CREATE OR REPLACE FUNCTION registrar_uso_promocion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.promocion_id IS NOT NULL AND NEW.descuento > 0 THEN
        INSERT INTO historial_promociones (promocion_id, cliente_id, venta_id, descuento_aplicado)
        VALUES (NEW.promocion_id, NEW.cliente_id, NEW.id, NEW.descuento)
        ON CONFLICT (promocion_id, cliente_id, venta_id) DO NOTHING;
        
        UPDATE promociones 
        SET usos_actuales = usos_actuales + 1 
        WHERE id = NEW.promocion_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_uso_promocion
AFTER INSERT ON ventas
FOR EACH ROW EXECUTE FUNCTION registrar_uso_promocion();

-- Trigger: Sincronizar login_security
CREATE OR REPLACE FUNCTION sincronizar_login_security()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO login_security (user_id, email, login_attempts)
    VALUES (NEW.id, NEW.email, 0)
    ON CONFLICT (email) DO UPDATE SET user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_login
AFTER INSERT ON usuarios
FOR EACH ROW EXECUTE FUNCTION sincronizar_login_security();

-- =====================================================
-- PASO 6: DATOS INICIALES
-- =====================================================

-- Usuario admin
INSERT INTO usuarios (firebase_uid, email, password_hash, nombre, rol, activo) 
VALUES ('admin-inicial', 'admin@joyeriadianalaura.com', 'hash_temp', 'Administrador', 'admin', true);

-- Configuración
INSERT INTO configuracion (clave, valor, tipo_dato, descripcion, categoria, actualizado_por) VALUES
('iva_porcentaje', '16.00', 'decimal', 'Porcentaje de IVA', 'fiscal', 1),
('margen_ganancia_default', '40.00', 'decimal', 'Margen de ganancia predeterminado (%)', 'ventas', 1),
('costo_envio_default', '100.00', 'decimal', 'Costo de envío estándar (MXN)', 'envios', 1),
('envio_gratis_desde', '1000.00', 'decimal', 'Compra mínima para envío gratis (MXN)', 'envios', 1),
('stock_minimo_default', '5', 'integer', 'Stock mínimo predeterminado', 'inventario', 1),
('dias_cancelacion', '24', 'integer', 'Horas para cancelar sin penalización', 'ventas', 1);

-- Páginas básicas
INSERT INTO paginas (nombre, slug, descripcion, orden, mostrar_en_menu, activo, creado_por) VALUES
('Inicio', 'inicio', 'Página principal', 0, true, true, 1),
('Nosotros', 'nosotros', 'Acerca de la joyería', 1, true, true, 1),
('Catálogo', 'catalogo', 'Productos disponibles', 2, true, true, 1),
('Preguntas Frecuentes', 'faq', 'Dudas comunes', 3, true, true, 1),
('Contacto', 'contacto', 'Información de contacto', 4, true, true, 1);

-- Métodos de pago
INSERT INTO metodos_pago (nombre, codigo, tipo, descripcion, orden, activo, creado_por) VALUES
('Transferencia Bancaria', 'transferencia', 'transferencia', 'Pago directo a cuenta bancaria', 1, true, 1),
('Efectivo en Tienda', 'efectivo', 'efectivo', 'Pago al recoger en tienda', 2, true, 1);

-- Categorías
INSERT INTO categorias (nombre, descripcion, orden, activo, creado_por) VALUES
('Anillos', 'Anillos de compromiso y moda', 1, true, 1),
('Collares', 'Collares elegantes', 2, true, 1),
('Pulseras', 'Pulseras de diversos estilos', 3, true, 1),
('Aretes', 'Aretes largos y de botón', 4, true, 1),
('Cadenas', 'Cadenas de oro y plata', 5, true, 1);

-- Tipos de producto
INSERT INTO tipos_producto (nombre, descripcion, activo, creado_por) VALUES
('Joyería Fina', 'Oro, plata y metales preciosos', true, 1),
('Bisutería', 'Acero y materiales alternativos', true, 1);

COMMIT;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Total de tablas: 42
-- Normalización: 3FN con desnormalización estratégica
-- Idioma: Español (excepto módulo usuario)
-- Soft delete: Todas las tablas principales
-- =====================================================