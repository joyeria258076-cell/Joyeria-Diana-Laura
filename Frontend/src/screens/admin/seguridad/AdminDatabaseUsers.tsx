// Frontend/src/screens/admin/seguridad/AdminDatabaseUsers.tsx
import React, { useState, useEffect } from 'react';
import { userManagementAPI } from '../../../services/api';
import './AdminDatabaseUsers.css';
import { 
  FiUsers, FiUserPlus, FiLock, FiShield, FiDatabase, 
  FiKey, FiCheckCircle, FiXCircle, FiInfo, FiPlus,
  FiTrash2, FiRefreshCw
} from 'react-icons/fi';

interface DatabaseUser {
  username: string;
  is_superuser: boolean;
  can_create_db: boolean;
  has_password: boolean;
}

interface DatabaseRole {
  role_name: string;
  is_super: boolean;
  can_login: boolean;
}

const AdminDatabaseUsers: React.FC = () => {
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [roles, setRoles] = useState<DatabaseRole[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'readonly', schemas: '' });
  const [newSchema, setNewSchema] = useState({ name: '', owner: '' });
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, schemasRes] = await Promise.all([
        userManagementAPI.getDatabaseUsers(),
        userManagementAPI.getSchemas()
      ]);
      
      if (usersRes.success) {
        setUsers(usersRes.data.users);
        setRoles(usersRes.data.roles);
      }
      
      if (schemasRes.success) {
        setSchemas(schemasRes.data);
      }
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      showMessage('error', 'Complete todos los campos');
      return;
    }

    try {
      const response = await userManagementAPI.createDatabaseUser(newUser);
      if (response.success) {
        showMessage('success', `Usuario ${newUser.username} creado`);
        setShowCreateModal(false);
        loadData();
        setNewUser({ username: '', password: '', role: 'readonly', schemas: '' });
      }
    } catch (error: any) {
      showMessage('error', error.message);
    }
  };

  const handleRevokeAccess = async (username: string) => {
    if (!window.confirm(`¿Revocar acceso al usuario ${username}?`)) return;
    try {
      const response = await userManagementAPI.revokeUserAccess(username);
      if (response.success) {
        showMessage('success', `Acceso revocado para ${username}`);
        loadData();
      }
    } catch (error: any) {
      showMessage('error', error.message);
    }
  };

  const handleCreateSchema = async () => {
    if (!newSchema.name) {
      showMessage('error', 'Nombre del esquema requerido');
      return;
    }

    try {
      const response = await userManagementAPI.createSchema(newSchema.name, newSchema.owner);
      if (response.success) {
        showMessage('success', `Esquema ${newSchema.name} creado`);
        setShowSchemaModal(false);
        loadData();
        setNewSchema({ name: '', owner: '' });
      }
    } catch (error: any) {
      showMessage('error', error.message);
    }
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="db-users-container">
      <div className="db-users-header">
        <h1><FiDatabase /> Administración de Base de Datos</h1>
        <p>Gestión de usuarios, roles y esquemas en PostgreSQL</p>
      </div>

      {message && (
        <div className={`db-message ${message.type}`}>
          {message.type === 'success' && <FiCheckCircle />}
          {message.type === 'error' && <FiXCircle />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="db-actions-bar">
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          <FiUserPlus /> Crear Usuario BD
        </button>
        <button className="btn-create" onClick={() => setShowSchemaModal(true)}>
          <FiPlus /> Crear Esquema
        </button>
        <button className="btn-refresh" onClick={loadData}>
          <FiRefreshCw /> Actualizar
        </button>
      </div>

      <div className="db-stats-grid">
        <div className="stat-card">
          <FiUsers className="stat-icon" />
          <div className="stat-content">
            <span className="stat-label">Usuarios BD</span>
            <span className="stat-value">{users.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <FiShield className="stat-icon" />
          <div className="stat-content">
            <span className="stat-label">Roles</span>
            <span className="stat-value">{roles.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <FiDatabase className="stat-icon" />
          <div className="stat-content">
            <span className="stat-label">Esquemas</span>
            <span className="stat-value">{schemas.length}</span>
          </div>
        </div>
      </div>

      <div className="users-section">
        <h2>Usuarios de Base de Datos</h2>
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Superusuario</th>
                <th>Crear BD</th>
                <th>Password</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.username}>
                  <td><strong>{user.username}</strong></td>
                  <td>{user.is_superuser ? '✅ Sí' : '❌ No'}</td>
                  <td>{user.can_create_db ? '✅ Sí' : '❌ No'}</td>
                  <td>{user.has_password ? '✅ Configurada' : '❌ No'}</td>
                  <td>
                    {!user.is_superuser && user.username !== 'neondb_owner' && (
                      <button 
                        className="btn-revoke"
                        onClick={() => handleRevokeAccess(user.username)}
                      >
                        <FiLock /> Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="roles-section">
        <h2>Roles Disponibles</h2>
        <div className="roles-grid">
          {roles.map((role) => (
            <div key={role.role_name} className="role-card">
              <FiKey className="role-icon" />
              <span className="role-name">{role.role_name}</span>
              <span className="role-badge">
                {role.can_login ? 'Login permitido' : 'Rol de grupo'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="schemas-section">
        <h2>Esquemas</h2>
        <div className="schemas-list">
          {schemas.map((schema) => (
            <div key={schema} className="schema-tag">
              <FiDatabase size={12} /> {schema}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Crear Usuario */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiUserPlus /> Crear Usuario de Base de Datos</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre de usuario</label>
                <input
                  type="text"
                  placeholder="ej: joyeria_ventas"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  placeholder="********"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="admin">Administrador (acceso total)</option>
                  <option value="manager">Gestor (catálogo, ventas)</option>
                  <option value="readonly">Solo Lectura</option>
                </select>
              </div>
              <div className="form-group">
                <label>Search Path (esquemas, separados por coma)</label>
                <input
                  type="text"
                  placeholder="auth, catalog, sales"
                  value={newUser.schemas}
                  onChange={(e) => setNewUser({ ...newUser, schemas: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancelar</button>
              <button className="btn-create" onClick={handleCreateUser}>Crear Usuario</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Esquema */}
      {showSchemaModal && (
        <div className="modal-overlay" onClick={() => setShowSchemaModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiPlus /> Crear Esquema</h2>
              <button className="btn-close" onClick={() => setShowSchemaModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre del esquema</label>
                <input
                  type="text"
                  placeholder="ej: reporting"
                  value={newSchema.name}
                  onChange={(e) => setNewSchema({ ...newSchema, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Propietario (opcional)</label>
                <input
                  type="text"
                  placeholder="joyeria_admin"
                  value={newSchema.owner}
                  onChange={(e) => setNewSchema({ ...newSchema, owner: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowSchemaModal(false)}>Cancelar</button>
              <button className="btn-create" onClick={handleCreateSchema}>Crear Esquema</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDatabaseUsers;