// Backend/src/controllers/admin/userManagementController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { getAdminPool } from '../../config/database';

export const userManagementController = {
  
  /**
   * Obtener todos los usuarios de la base de datos PostgreSQL
   */
  async getDatabaseUsers(req: AuthRequest, res: Response) {
    try {
      const adminPool = getAdminPool();
      
      // Consultar usuarios de PostgreSQL
      const result = await adminPool.query(`
        SELECT 
          usename as username,
          usesuper as is_superuser,
          usecreatedb as can_create_db,
          userepl as can_replicate,
          passwd IS NOT NULL as has_password,
          valuntil as password_expiry
        FROM pg_user
        ORDER BY usename
      `);
      
      // Obtener roles asignados
      const rolesResult = await adminPool.query(`
        SELECT 
          r.rolname as role_name,
          r.rolsuper as is_super,
          r.rolcreaterole as can_create_role,
          r.rolcreatedb as can_create_db,
          r.rolcanlogin as can_login
        FROM pg_roles r
        ORDER BY r.rolname
      `);
      
      res.json({
        success: true,
        data: {
          users: result.rows,
          roles: rolesResult.rows
        }
      });
      
    } catch (error) {
      console.error('Error obteniendo usuarios de BD:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Error al obtener usuarios' 
      });
    }
  },
  
  /**
   * Crear un nuevo usuario en PostgreSQL
   */
  async createDatabaseUser(req: AuthRequest, res: Response) {
    try {
      const { username, password, role, schemas } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Usuario y contraseña son requeridos' 
        });
      }
      
      const adminPool = getAdminPool();
      
      // 1. Crear el usuario
      await adminPool.query(`
        CREATE USER ${username} WITH PASSWORD '${password}'
      `);
      
      // 2. Asignar rol según el tipo seleccionado
      if (role === 'admin') {
        // Asignar rol_admin
        await adminPool.query(`GRANT rol_admin TO ${username}`);
        // Dar permisos sobre todos los esquemas
        await adminPool.query(`GRANT ALL PRIVILEGES ON SCHEMA seguridad TO ${username}`);
        await adminPool.query(`GRANT ALL PRIVILEGES ON SCHEMA catalogo TO ${username}`);
        await adminPool.query(`GRANT ALL PRIVILEGES ON SCHEMA ventas TO ${username}`);
        await adminPool.query(`GRANT ALL PRIVILEGES ON SCHEMA inventario TO ${username}`);
        await adminPool.query(`GRANT ALL PRIVILEGES ON SCHEMA contenido TO ${username}`);
        await adminPool.query(`GRANT ALL PRIVILEGES ON SCHEMA configuracion TO ${username}`);
        await adminPool.query(`GRANT ALL PRIVILEGES ON SCHEMA auditoria TO ${username}`);
        await adminPool.query(`GRANT ALL PRIVILEGES ON SCHEMA publico TO ${username}`);
        
      } else if (role === 'trabajador') {
        // Asignar rol_trabajador
        await adminPool.query(`GRANT rol_trabajador TO ${username}`);
        // Dar permisos de gestión
        await adminPool.query(`GRANT USAGE ON SCHEMA catalogo TO ${username}`);
        await adminPool.query(`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA catalogo TO ${username}`);
        await adminPool.query(`GRANT USAGE ON SCHEMA ventas TO ${username}`);
        await adminPool.query(`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ventas TO ${username}`);
        await adminPool.query(`GRANT USAGE ON SCHEMA inventario TO ${username}`);
        await adminPool.query(`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA inventario TO ${username}`);
        await adminPool.query(`GRANT USAGE ON SCHEMA contenido TO ${username}`);
        await adminPool.query(`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA contenido TO ${username}`);
        
      } else if (role === 'cliente') {
        // Asignar rol_cliente
        await adminPool.query(`GRANT rol_cliente TO ${username}`);
        // Dar permisos de cliente
        await adminPool.query(`GRANT USAGE ON SCHEMA publico TO ${username}`);
        await adminPool.query(`GRANT SELECT ON publico.vista_productos_publicos TO ${username}`);
        await adminPool.query(`GRANT USAGE ON SCHEMA catalogo TO ${username}`);
        await adminPool.query(`GRANT SELECT ON ALL TABLES IN SCHEMA catalogo TO ${username}`);
        await adminPool.query(`GRANT USAGE ON SCHEMA ventas TO ${username}`);
        await adminPool.query(`GRANT SELECT, INSERT, UPDATE ON ventas.carrito TO ${username}`);
        await adminPool.query(`GRANT SELECT ON ventas.ventas TO ${username}`);
        await adminPool.query(`GRANT INSERT ON ventas.ventas TO ${username}`);
        
      } else if (role === 'visitante') {
        // Asignar rol_visitante
        await adminPool.query(`GRANT rol_visitante TO ${username}`);
        // Dar permisos de solo lectura pública
        await adminPool.query(`GRANT USAGE ON SCHEMA publico TO ${username}`);
        await adminPool.query(`GRANT SELECT ON publico.vista_productos_publicos TO ${username}`);
        await adminPool.query(`GRANT SELECT ON publico.vista_categorias_publicas TO ${username}`);
        await adminPool.query(`GRANT USAGE ON SCHEMA catalogo TO ${username}`);
        await adminPool.query(`GRANT SELECT ON ALL TABLES IN SCHEMA catalogo TO ${username}`);
        
      } else if (role === 'sistema') {
        // Asignar rol_sistema
        await adminPool.query(`GRANT rol_sistema TO ${username}`);
        // Dar permisos para auditoría
        await adminPool.query(`GRANT USAGE ON SCHEMA auditoria TO ${username}`);
        await adminPool.query(`GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA auditoria TO ${username}`);
      }
      
      // 3. Configurar search_path según el rol
      let defaultSchemas = '';
      if (role === 'admin') {
        defaultSchemas = 'publico, seguridad, catalogo, ventas, inventario, contenido, configuracion, auditoria';
      } else if (role === 'trabajador') {
        defaultSchemas = 'publico, seguridad, catalogo, ventas, inventario, contenido, configuracion';
      } else if (role === 'cliente') {
        defaultSchemas = 'publico, seguridad, catalogo, ventas';
      } else if (role === 'visitante') {
        defaultSchemas = 'publico, catalogo';
      } else if (role === 'sistema') {
        defaultSchemas = 'auditoria';
      }
      
      if (schemas) {
        await adminPool.query(`ALTER USER ${username} SET search_path = ${schemas}`);
      } else if (defaultSchemas) {
        await adminPool.query(`ALTER USER ${username} SET search_path = ${defaultSchemas}`);
      }
      
      res.json({
        success: true,
        message: `Usuario ${username} creado exitosamente con rol ${role}`,
        data: { username, role }
      });
      
    } catch (error: any) {
      console.error('Error creando usuario de BD:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al crear usuario' 
      });
    }
  },
  
  /**
   * Revocar acceso de un usuario
   */
  async revokeUserAccess(req: AuthRequest, res: Response) {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({ success: false, message: 'Nombre de usuario requerido' });
      }
      
      const adminPool = getAdminPool();
      
      // Revocar todos los permisos de todos los esquemas
      const schemas = ['seguridad', 'catalogo', 'ventas', 'inventario', 'contenido', 'configuracion', 'auditoria', 'publico'];
      
      for (const schema of schemas) {
        await adminPool.query(`REVOKE ALL PRIVILEGES ON SCHEMA ${schema} FROM ${username}`);
        await adminPool.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${schema} FROM ${username}`);
        await adminPool.query(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${schema} FROM ${username}`);
      }
      
      // También revocar el rol
      await adminPool.query(`REVOKE rol_admin FROM ${username}`);
      await adminPool.query(`REVOKE rol_trabajador FROM ${username}`);
      await adminPool.query(`REVOKE rol_cliente FROM ${username}`);
      await adminPool.query(`REVOKE rol_visitante FROM ${username}`);
      await adminPool.query(`REVOKE rol_sistema FROM ${username}`);
      
      // Opcional: eliminar el usuario (comentado por seguridad)
      // await adminPool.query(`DROP USER ${username}`);
      
      res.json({
        success: true,
        message: `Acceso revocado para ${username}. Todos los permisos han sido eliminados.`
      });
      
    } catch (error: any) {
      console.error('Error revocando acceso:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al revocar acceso' 
      });
    }
  },
  
  /**
   * Obtener esquemas disponibles
   */
  async getSchemas(req: AuthRequest, res: Response) {
    try {
      const adminPool = getAdminPool();
      
      const result = await adminPool.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
        ORDER BY schema_name
      `);
      
      res.json({
        success: true,
        data: result.rows.map(r => r.schema_name)
      });
      
    } catch (error) {
      console.error('Error obteniendo esquemas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener esquemas' });
    }
  },
  
  /**
   * Crear un nuevo esquema
   */
  async createSchema(req: AuthRequest, res: Response) {
    try {
      const { schemaName, owner } = req.body;
      
      if (!schemaName) {
        return res.status(400).json({ success: false, message: 'Nombre del esquema requerido' });
      }
      
      const adminPool = getAdminPool();
      
      await adminPool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
      
      if (owner) {
        await adminPool.query(`ALTER SCHEMA ${schemaName} OWNER TO ${owner}`);
      }
      
      res.json({
        success: true,
        message: `Esquema ${schemaName} creado exitosamente`
      });
      
    } catch (error: any) {
      console.error('Error creando esquema:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al crear esquema' 
      });
    }
  }
};