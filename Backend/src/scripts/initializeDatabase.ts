// Backend/src/scripts/initializeDatabase.ts
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseRestorer {
  private client: Client;

  constructor() {
    this.client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number.parseInt(process.env.DB_PORT || '5432'),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
    });
  }

  private log(msg: string): void {
    console.log(`[${new Date().toLocaleTimeString('es-ES')}] ${msg}`);
  }

  async run(): Promise<void> {
    try {
      await this.client.connect();
      this.log('✅ Conectado a PostgreSQL');

      // Limpiar schema
      this.log('🗑️ Eliminando schema público...');
      await this.client.query('DROP SCHEMA IF EXISTS public CASCADE');
      await this.client.query('CREATE SCHEMA public');
      this.log('✅ Schema eliminado y recreado');

      // Leer SQL
      const sqlPath = path.join(__dirname, 'BD_SIMPLIFICADA_OPTIMIZADA (1).sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      this.log(`✅ Archivo SQL cargado (${sql.length} bytes)`);

      // Ejecutar SQL
      this.log('⏳ Ejecutando DDL y FK...');
      await this.client.query(sql);
      this.log('✅ BD restaurada exitosamente');

    } catch (error: any) {
      this.log(`❌ Error: ${error.message}`);
      process.exit(1);
    } finally {
      await this.client.end();
      this.log('✅ Desconectado');
    }
  }
}

new DatabaseRestorer().run();
