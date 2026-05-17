import pg from 'pg';
const { Pool } = pg;

let pool: any = null;

// User provided connection string (properly encoded)
const USER_CONNECTION_STRING = "postgresql://postgres:%40Eroll%4012%2Cf@db.juoerargoycuocepiqsh.supabase.co:5432/postgres";

export function getPool() {
  if (!pool) {
    let connectionString = 
      process.env.STORAGE_POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL || 
      process.env.POSTGRES_URL || 
      process.env.STORAGE_POSTGRES_URL;
    
    let usedEnvVar = 'USER_CONNECTION_STRING';
    if (process.env.STORAGE_POSTGRES_URL_NON_POOLING) usedEnvVar = 'STORAGE_POSTGRES_URL_NON_POOLING';
    else if (process.env.DATABASE_URL) usedEnvVar = 'DATABASE_URL';
    else if (process.env.POSTGRES_URL) usedEnvVar = 'POSTGRES_URL';
    else if (process.env.STORAGE_POSTGRES_URL) usedEnvVar = 'STORAGE_POSTGRES_URL';
    
    // If connection string is missing, is a placeholder, or looks like a REST API URL instead of a DB URL
    if (!connectionString || 
        connectionString.trim() === '' || 
        connectionString === 'base' || 
        connectionString.includes('placeholder') ||
        connectionString.includes('.apirest.') ||
        connectionString === 'undefined' ||
        connectionString === 'null' ||
        connectionString.startsWith('http') ||
        connectionString.startsWith('HTTP')) {
      
      console.warn('Database environment variable is missing or invalid. Using fallback connection string.');
      connectionString = USER_CONNECTION_STRING;
      usedEnvVar = 'USER_CONNECTION_STRING';
    }

    console.log(`Using database connection from: ${usedEnvVar}`);
    connectionString = connectionString.trim().replace(/^["']|["']$/g, '');
    
    // Fix common Supabase IPv6 issue in IPv4-only environments
    // Direct host (db.ref.supabase.co) fails with ECONNREFUSED often due to IPv6
    // Using pooler host is the official workaround for IPv4 environments
    if (connectionString.includes('.supabase.co') && !connectionString.includes('.pooler.supabase.com')) {
      console.log('Direct Supabase host detected. Switching to pooler host for IPv4 compatibility.');
      connectionString = connectionString.replace(/db\.([a-z0-9]+)\.supabase\.co/g, 'aws-1-us-east-1.pooler.supabase.com');
      // Ensure the username has the project ref which is required by the pooler
      if (!connectionString.includes('postgres.juoerargoycuocepiqsh')) {
        connectionString = connectionString.replace('postgres:', 'postgres.juoerargoycuocepiqsh:');
      }
    }
    
    // Ensure it starts with postgresql:// or postgres://
    if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
      console.warn('Database connection string missing protocol. Attempting to fix.');
      connectionString = 'postgres://' + connectionString;
    }
    
    // Log masked connection string for debugging
    try {
      if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
        const dbUrl = new URL(connectionString);
        console.log('Database connecting to:', {
          protocol: dbUrl.protocol,
          host: dbUrl.hostname,
          port: dbUrl.port,
          database: dbUrl.pathname.slice(1)
        });
      } else {
        console.log('Database connection string detected (not a standard URL format). Length:', connectionString.length);
      }
    } catch (e: any) {
      console.log('Database connection string diagnostic failed:', e.message, 'String was:', connectionString.substring(0, 10) + '...');
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
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
      detail: err.detail,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });
    // Provide more helpful error messages for connection issues
    if (err.message.includes('getaddrinfo') || err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT') || err.message.includes('self signed certificate')) {
      throw new Error(`Database connection failed: ${err.message}. Check your DATABASE_URL and SSL settings.`);
    }
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
          const bcrypt = await import('bcryptjs');
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
