// Backend/src/scripts/recreate-all-tables.ts
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function recreateAllTables() {
  console.log('🚀 Iniciando recreación de todas las tablas...');
  
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // 🗑️ ELIMINAR TABLAS EXISTENTES (en orden por dependencias)
    console.log('🗑️ Eliminando tablas existentes...');
    
    const dropTables = [
      'DROP TABLE IF EXISTS user_sessions CASCADE',
      'DROP TABLE IF EXISTS login_attempts CASCADE',
      'DROP TABLE IF EXISTS login_security CASCADE',
      'DROP TABLE IF EXISTS security_questions CASCADE',
      'DROP TABLE IF EXISTS usuarios CASCADE'
    ];

    for (const dropQuery of dropTables) {
      try {
        await client.query(dropQuery);
        console.log(`✅ ${dropQuery.split(' ')[2]} eliminada`);
      } catch (error: any) {
        console.log(`⚠️ ${dropQuery.split(' ')[2]}: ${error.message}`);
      }
    }

    // 🏗️ CREAR TABLAS (en orden por dependencias)

    // 1. Tabla usuarios (base)
    console.log('🏗️ Creando tabla usuarios...');
    await client.query(`
      CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(128) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nombre VARCHAR(100),
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        recovery_attempts INTEGER DEFAULT 0,
        last_recovery_attempt TIMESTAMP,
        recovery_blocked_until TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        mfa_enabled BOOLEAN DEFAULT false,
        mfa_secret VARCHAR(100),
        mfa_backup_codes TEXT[]
      )
    `);
    console.log('✅ Tabla usuarios creada');

    // 2. Tabla security_questions
    console.log('🏗️ Creando tabla security_questions...');
    await client.query(`
      CREATE TABLE security_questions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        question_text VARCHAR(500) NOT NULL,
        answer_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('✅ Tabla security_questions creada');

    // 3. Tabla login_security
    console.log('🏗️ Creando tabla login_security...');
    await client.query(`
      CREATE TABLE login_security (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        login_attempts INTEGER DEFAULT 0,
        last_login_attempt TIMESTAMP,
        login_blocked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla login_security creada');

    // 4. Tabla login_attempts
    console.log('🏗️ Creando tabla login_attempts...');
    await client.query(`
      CREATE TABLE login_attempts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN NOT NULL,
        failure_reason VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla login_attempts creada');

    // 5. Tabla user_sessions
    console.log('🏗️ Creando tabla user_sessions...');
    await client.query(`
      CREATE TABLE user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
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
        is_revoked BOOLEAN DEFAULT FALSE,
        revoked_at TIMESTAMP
      )
    `);
    console.log('✅ Tabla user_sessions creada');

    // 📊 CREAR ÍNDICES PARA MEJOR PERFORMANCE

    console.log('📊 Creando índices...');

    // Índices para tabla usuarios
    await client.query('CREATE INDEX idx_usuarios_email ON usuarios(email)');
    await client.query('CREATE INDEX idx_usuarios_activo ON usuarios(activo)');
    await client.query('CREATE INDEX idx_usuarios_firebase_uid ON usuarios(firebase_uid)');
    await client.query('CREATE INDEX idx_usuarios_last_activity ON usuarios(last_activity)');
    await client.query('CREATE INDEX idx_usuarios_mfa_enabled ON usuarios(mfa_enabled)');
    console.log('✅ Índices de usuarios creados');

    // Índices para tabla security_questions
    await client.query('CREATE INDEX idx_security_questions_user_id ON security_questions(user_id)');
    console.log('✅ Índices de security_questions creados');

    // Índices para tabla login_security
    await client.query('CREATE INDEX idx_login_security_email ON login_security(email)');
    await client.query('CREATE INDEX idx_login_security_blocked ON login_security(login_blocked_until)');
    console.log('✅ Índices de login_security creados');

    // Índices para tabla login_attempts
    await client.query('CREATE INDEX idx_login_attempts_email ON login_attempts(email)');
    await client.query('CREATE INDEX idx_login_attempts_time ON login_attempts(attempt_time)');
    await client.query('CREATE INDEX idx_login_attempts_success ON login_attempts(success)');
    await client.query('CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address)');
    console.log('✅ Índices de login_attempts creados');

    // Índices para tabla user_sessions
    await client.query('CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id)');
    await client.query('CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token)');
    await client.query('CREATE INDEX idx_user_sessions_firebase_uid ON user_sessions(firebase_uid)');
    await client.query('CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity)');
    await client.query('CREATE INDEX idx_user_sessions_is_revoked ON user_sessions(is_revoked)');
    await client.query('CREATE INDEX idx_user_sessions_device_fingerprint ON user_sessions(device_fingerprint)');
    await client.query('CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at)');
    console.log('✅ Índices de user_sessions creados');

    // 🔍 VERIFICAR ESTRUCTURA CREADA

    console.log('🔍 Verificando estructura de tablas...');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tablas creadas:');
    tables.rows.forEach((table: any) => {
      console.log(`   - ${table.table_name}`);
    });

    // 📈 CONTAR COLUMNAS POR TABLA
    for (const table of tables.rows) {
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      console.log(`\n🏗️ Estructura de ${table.table_name}:`);
      columns.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }

    console.log('\n🎉 ¡TODAS LAS TABLAS RECREADAS EXITOSAMENTE!');
    console.log('📊 Resumen:');
    console.log('   - 5 tablas principales creadas');
    console.log('   - Índices de performance configurados');
    console.log('   - Relaciones foreign key establecidas');
    console.log('   - Estructura optimizada para la aplicación');

    // 💡 RECOMENDACIONES
    console.log('\n💡 Recomendaciones:');
    console.log('   1. Ejecuta el servidor: npm run dev');
    console.log('   2. Los usuarios deberán registrarse nuevamente');
    console.log('   3. Las sesiones anteriores se perdieron');
    console.log('   4. La configuración MFA deberá reactivarse');

  } catch (error: any) {
    console.error('❌ Error recreando tablas:', error.message);
    console.log('🔍 Detalles del error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión a la base de datos cerrada');
  }
}

// Ejecutar el script
recreateAllTables();