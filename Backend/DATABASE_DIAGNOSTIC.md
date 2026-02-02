# Diagnóstico y Solución de Problema de Roles

## Problema
Los usuarios se redirigen siempre a `InicioScreen` aunque tengan rol de `admin` o `trabajador`.

## Causa Probable
La columna `rol` en la tabla `usuarios` podría no existir o todos los registros tienen `rol = NULL`.

## Diagnóstico

### 1. Verificar la columna en la BD
Ejecuta en PostgreSQL:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'usuarios' AND column_name = 'rol';
```

### 2. Verificar los valores actuales
```sql
SELECT id, email, nombre, rol FROM usuarios LIMIT 10;
```

### 3. Usar el endpoint de diagnóstico del API
```bash
GET /api/auth/diagnostic/users-table
```

## Soluciones

### Si la columna NO existe:
Crea la columna con el tipo enum:
```sql
CREATE TYPE rol_enum AS ENUM ('admin', 'trabajador', 'cliente');

ALTER TABLE usuarios 
ADD COLUMN rol rol_enum DEFAULT 'cliente';
```

### Si la columna existe pero todos tienen NULL:
Actualiza los valores por defecto:
```sql
UPDATE usuarios SET rol = 'cliente' WHERE rol IS NULL;
```

### Si necesitas asignar roles específicos:
```sql
-- Actualizar usuarios específicos
UPDATE usuarios SET rol = 'admin' WHERE email = 'admin@example.com';
UPDATE usuarios SET rol = 'trabajador' WHERE email = 'trabajador@example.com';

-- Verificar cambios
SELECT id, email, nombre, rol FROM usuarios;
```

## Pasos para Verificar que Funciona

1. Ejecuta el comando de diagnóstico SQL arriba
2. Asegúrate de que al menos un usuario tenga `rol = 'admin'` o `rol = 'trabajador'`
3. Abre la consola del navegador (F12)
4. Inicia sesión con ese usuario
5. Verifica los logs en la consola:
   - Busca "🎭 Rol detectado:"
   - Busca "📦 Usuario del response:"
6. Deberías ser redirigido al dashboard correspondiente

## Logs Importantes

En el **Backend** (logs del servidor):
- `📊 Usuario obtenido de PostgreSQL:` - Verifica si el rol está aquí
- `🎭 Rol del usuario en BD:` - Debe mostrar 'admin', 'trabajador' o 'cliente'
- `🎭 Rol final:` - Debe mostrar el rol en la respuesta

En el **Frontend** (consola del navegador):
- `🎭 Rol detectado:` - Muestra qué rol se recibió del backend
- `📦 Usuario del response:` - Muestra el objeto completo del usuario
- `💾 Guardando usuario en contexto y localStorage:` - Verifica que el rol se guarda

## Verificación Final

Una vez que hayas actualizado los roles en la BD:
1. Inicia sesión nuevamente
2. Abre Developer Tools (F12)
3. Ve a Application > LocalStorage
4. Busca `diana_laura_user` 
5. Verifica que tenga la propiedad `"rol":"admin"` o similar
