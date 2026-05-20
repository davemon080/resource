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
    
    pool = new Pool({
      connectionString: cleanUrl,
      ssl: cleanUrl.includes('sslmode=require') || cleanUrl.includes('sslmode=verify-full') 
        ? { rejectUnauthorized: false } 
        : false,
      max: 20, // Increase max connections
      idleTimeoutMillis: 60000, // Keep connections open longer
      connectionTimeoutMillis: 10000, 
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    const resultSize = JSON.stringify(res.rows).length;
    
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
        query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
      ]).catch(e => console.warn('[DB] Failed to create indexes:', e.message));

      // 5. Column checks (idempotent)
      const alterQueries = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_module_index INTEGER DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`,
        `ALTER TABLE modules ADD COLUMN IF NOT EXISTS video_url TEXT`,
        `ALTER TABLE modules ADD COLUMN IF NOT EXISTS pdf_url TEXT`,
        `ALTER TABLE modules ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`,
        `ALTER TABLE modules ADD COLUMN IF NOT EXISTS duration INTEGER`
      ];

      // Run column checks sequentially to avoid locks
      for (const q of alterQueries) {
        await query(q).catch(() => {});
      }
      
      // 6. Seeding logic
      const adminEmails = ['simonodavido@gmail.com', 'davemon080@gmail.com', 'daveimagodei@gmail.com'];
      for (const email of adminEmails) {
        await query(
          'INSERT INTO admins (id, email) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM admins WHERE email = $2)',
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
      
      const checkModules = await query('SELECT 1 FROM modules LIMIT 1');
      if (checkModules.rows.length === 0) {
        console.log('[DB] Seeding initial modules...');
        const modules = [
          ['11111111-1111-1111-1111-111111111111', 'Introduction to Full Stack Development', 'An overview of the modern web development ecosystem.', 'video', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 0, 60],
          ['22222222-2222-2222-2222-222222222222', 'Cloud Architecture Basics', 'Learn the fundamentals of cloud infrastructure.', 'video', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 1, 120]
        ];
        
        for (const [id, title, desc, type, url, idx, dur] of modules) {
          await query(
            'INSERT INTO modules (id, title, description, type, video_url, order_index, duration) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
            [id, title, desc, type, url, idx, dur]
          ).catch(() => {});
        }
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
