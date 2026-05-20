import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
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
      console.error('❌ DATABASE_URL is missing! Please set it in the AI Studio Settings menu.');
      throw new Error('Database connection string is missing.');
    }

    const cleanUrl = connectionString.trim().replace(/^["']|["']$/g, '');
    console.log('Database connecting to Neon Postgres...');
    
    const isLocalhost = cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1') || cleanUrl.includes('0.0.0.0');
    const isServerless = typeof process !== 'undefined' && (process.env.VERCEL === '1' || !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME);

    // Default to secure SSL for cloud hosts (Neon, Supabase, Render, ElephantSQL, Elephant, etc.)
    const sslConfig = isLocalhost || cleanUrl.includes('sslmode=disable')
      ? false
      : { rejectUnauthorized: false };

    pool = new Pool({
      connectionString: cleanUrl,
      ssl: sslConfig,
      max: isServerless ? 2 : 20, // Keep connection pool extremely thin on serverless functions to avoid connection exhaustion
      idleTimeoutMillis: isServerless ? 10000 : 60000, // Close idle connections quickly in serverless environments
      connectionTimeoutMillis: 30000, // 30 seconds connection timeout for cold-starts
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    let resultSize = 0;
    try {
      resultSize = JSON.stringify(res.rows).length;
    } catch (e: any) {
      console.warn('[DB] Failed to stringify rows for size estimation:', e.message);
    }
    
    if (duration > 500) {
      console.warn(`[SLOW QUERY] Duration: ${duration}ms, Rows: ${res.rowCount}, Size: ${(resultSize / 1024).toFixed(2)}KB`);
    } else {
      console.log('executed query', { duration, rows: res.rowCount });
    }
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
  if (dbInitialized) return Promise.resolve();
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    try {
      console.log('[DB] Initialization started...');
      
      const pool = getPool();
      // Test connection
      await pool.query('SELECT 1');

      // Optimization for serverless (Vercel) cold-starts: Check if tables already exist
      // This reduces startup overhead from 12+ sequential queries to a single quick check.
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
          AND c.relname = 'users'
        );
      `);
      
      if (tableCheck.rows[0]?.exists) {
        console.log('[DB] Tables already exist, skipping heavy schema creation.');
        dbInitialized = true;
        return;
      }
      
      // Use parallel execution for non-dependent table creation
      await Promise.all([
        // 1. Create Admins Table
        query(`
          CREATE TABLE IF NOT EXISTS admins (
            id VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255) NOT NULL
          );
        `),
        // 2. Create Modules Table
        query(`
          CREATE TABLE IF NOT EXISTS modules (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(10),
            video_url TEXT,
            pdf_url TEXT,
            thumbnail_url TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            duration INTEGER
          );
        `),
        // 3. Create Users Table
        query(`
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
        `)
      ]);

      // 4. Create Indexes for performance
      await Promise.all([
        query('CREATE INDEX IF NOT EXISTS idx_modules_order ON modules(order_index)'),
        query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'),
        query('CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email)')
      ]).catch(e => console.warn('[DB] Failed to create indexes:', e.message));

      // 5. Column checks (idempotent - batched into single calls for ultra-fast performance)
      await Promise.all([
        query(`
          ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS password_hash TEXT,
            ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS photo_url TEXT,
            ADD COLUMN IF NOT EXISTS unlocked_module_index INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
        `),
        query(`
          ALTER TABLE modules 
            ADD COLUMN IF NOT EXISTS video_url TEXT,
            ADD COLUMN IF NOT EXISTS pdf_url TEXT,
            ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
            ADD COLUMN IF NOT EXISTS duration INTEGER
        `)
      ]).catch(e => console.warn('[DB] Failed columns verification:', e.message));
      
      // 6. Seeding logic (Setup real admin emails only, no dummy modules)
      const adminEmails = ['simonodavido@gmail.com', 'davemon080@gmail.com', 'daveimagodei@gmail.com'];
      for (const email of adminEmails) {
        await query(
          'INSERT INTO admins (id, email) SELECT $1, $2::varchar WHERE NOT EXISTS (SELECT 1 FROM admins WHERE email = $2::varchar)',
          [randomUUID(), email]
        ).catch(() => {});
      }
      
      const adminEmail = 'davemon080@gmail.com';
      const checkAdmin = await query('SELECT 1 FROM users WHERE email = $1', [adminEmail]);
      if (checkAdmin.rows.length === 0) {
        console.log('[DB] Seeding default admin user...');
        const hashedPassword = await bcrypt.hash('Admin', 10);
        await query(
          'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
          [randomUUID(), adminEmail, hashedPassword, 'Administrator']
        ).catch(e => console.error('[DB] Admin seeding failed:', e.message));
      }
      
      dbInitialized = true;
      console.log('[DB] Initialization complete.');
    } catch (err: any) {
      console.error('[DB] Critical: Database initialization failed:', err.message);
      initializingPromise = null;
      throw err;
    }
  })();

  return initializingPromise;
}
