-- HU-15 (app móvil #54): token de Firebase Cloud Messaging de cada teléfono con la app instalada.
-- Un token pertenece a un solo teléfono; si otra cuenta inicia sesión en ese teléfono, el token
-- pasa a esa cuenta. Al borrar el usuario se borran sus teléfonos.
CREATE TABLE IF NOT EXISTS dispositivos_push (
    id                 SERIAL PRIMARY KEY,
    usuario_id         INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token              TEXT NOT NULL UNIQUE,
    plataforma         VARCHAR(20) NOT NULL DEFAULT 'android',
    fecha_registro     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_push_usuario ON dispositivos_push(usuario_id);
