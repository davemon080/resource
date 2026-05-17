import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

let pool: any = null;

export function getPool() {
  if (!pool) {
    const connectionString = 
      process.env.DATABASE_URL || 
      process.env.POSTGRES_URL || 
      process.env.STORAGE_POSTGRES_URL ||
      process.env.STORAGE_POSTGRES_URL_NON_POOLING;
    
    if (!connectionString) {
      throw new Error('Database connection string is missing. Please set DATABASE_URL or POSTGRES_URL environment variable.');
    }

    console.log('Database connecting using environment variable...');
    
    pool = new Pool({
      connectionString: connectionString.trim().replace(/^["']|["']$/g, ''),
      ssl: {
        rejectUnauthorized: false
      },
      // Better for serverless: close idle clients quickly
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { duration, rows: res.rowCount });
    return res;
  } catch (err: any) {
    console.error('Query failed!', { 
      message: err.message, 
      code: err.code, 
      detail: err.detail
    });
    throw err;
  }
}

let dbInitialized = false;
let initializingPromise: Promise<void> | null = null;

export async function initDb() {
  if (dbInitialized) return;
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    try {
      console.log('Initializing database tables...');
      // First ensure tables exist
      await query(`
        CREATE TABLE IF NOT EXISTS admins (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS modules (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(10) CHECK (type IN ('video', 'pdf')),
          video_url TEXT,
          pdf_url TEXT,
          thumbnail_url TEXT,
          order_index INTEGER NOT NULL,
          duration INTEGER
        );

        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name VARCHAR(255),
          photo_url TEXT,
          unlocked_module_index INTEGER DEFAULT 0,
          completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMP
        );
      `);
      
      // Seed admins
      try {
        const adminEmails = ['simonodavido@gmail.com', 'davemon080@gmail.com'];
        for (const email of adminEmails) {
          await query(
            'INSERT INTO admins (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
            [email.split('@')[0], email]
          );
        }
      } catch (err) {
        console.warn('Failed to seed admins:', err);
      }

      // Ensure individual columns exist for users
      try {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
      } catch (e) {}
      
      // Seed default admin user
      try {
        const adminEmail = 'davemon080@gmail.com';
        const adminPassword = 'Admin';
        const checkAdmin = await query('SELECT * FROM users WHERE email = $1', [adminEmail]);
        if (checkAdmin.rows.length === 0) {
          console.log('Seeding default admin user...');
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          const id = 'admin-default';
          await query(
            'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
            [id, adminEmail, hashedPassword, 'Administrator']
          );
          console.log('Default admin user seeded successfully.');
        }
      } catch (err) {
        console.warn('Failed to seed default user:', err);
      }
      
      dbInitialized = true;
      console.log('Database initialization complete.');
    } catch (err) {
      console.error('Critical: Database initialization failed:', err);
      initializingPromise = null;
      throw err;
    }
  })();

  return initializingPromise;
}
