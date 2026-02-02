-- Script de Diagnóstico y Corrección de Roles
-- Ejecuta estos comandos para diagnosticar y solucionar el problema de roles

-- 1. Verificar que la columna existe y su tipo
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'usuarios' AND column_name = 'rol';

-- 2. Ver todos los usuarios con su rol (para confirmar los datos)
SELECT id, email, nombre, rol FROM usuarios;

-- 3. Verificar que no haya roles NULL
SELECT COUNT(*) as registros_con_rol_null FROM usuarios WHERE rol IS NULL;

-- 4. Ver el tipo de dato exacto del enum
SELECT typname, typtype 
FROM pg_type 
WHERE typname = 'rol_enum';

-- 5. Ver los valores válidos del enum
SELECT enum_range(NULL::rol_enum);

-- 6. Si hay registros con rol NULL, actualizar:
-- UPDATE usuarios SET rol = 'cliente' WHERE rol IS NULL;

-- 7. Verificar nuevamente después de la actualización
SELECT id, email, nombre, rol, (rol::text) as rol_as_text FROM usuarios;
