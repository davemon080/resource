import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import { initDb, query, getPool } from './src/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const API_SECRET = process.env.API_SECRET;

const app = express();
export { app };

app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    // Dynamically mirror the origin header back to fully support all browser request scenarios, including sandboxed 'null' origins
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Request Logger with performance monitoring
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 2000) {
        console.warn(`[SLOW API] ${req.method} ${req.path} took ${duration}ms`);
      } else {
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      }
    });
  }
  next();
});

// Authorization Middleware for Master Secret
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  if (API_SECRET && (authHeader === `Bearer ${API_SECRET}` || apiKey === API_SECRET)) {
    (req as any).isMaster = true;
    return next();
  }
  
  // For normal requests, continue to individual route handlers which will check JWT if needed
  next();
};

app.use(authMiddleware);

// DB Initialization
(async () => {
  try {
    await initDb();
    console.log('Database initialized successfully on startup.');
  } catch (err: any) {
    console.error('Failed to initialize database on startup:', err.message);
  }
})();

// Middleware to ensure DB is initialized (acts as a safety and wait mechanism)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    initDb()
      .then(() => next())
      .catch((err: any) => {
        console.error('DB Initialization check failed:', err.message);
        res.status(503).json({ error: 'Database is still initializing or failed to connect', details: err.message });
      });
  } else {
    next();
  }
});

// Generic Query API (One API Link for Master Secret)
app.post('/api/query', async (req, res) => {
  if (!(req as any).isMaster) {
    return res.status(403).json({ error: 'Forbidden: Master API Secret required' });
  }

  const { sql, params } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  try {
    const result = await query(sql, params || []);
    res.json({
      rowCount: result.rowCount,
      rows: result.rows,
      command: result.command
    });
  } catch (err: any) {
    console.error('Master query failed:', err.message);
    res.status(500).json({ error: 'Query execution failed', details: err.message });
  }
});

// AI Proxy API
app.post('/api/ai', async (req, res) => {
  if (!(req as any).isMaster) {
    return res.status(403).json({ error: 'Forbidden: Master API Secret required' });
  }

  const { prompt, model = 'gemini-2.0-flash' } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key is not configured on server' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error('AI Proxy failed:', err.message);
    res.status(500).json({ error: 'AI generation failed', details: err.message });
  }
});

// Health Check API
app.get('/api/health', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      database: 'connected', 
      time: result.rows[0].now
    });
  } catch (err: any) {
    console.error('Health check failed:', err.message);
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected', 
      error: err.message,
      suggestion: err.message.includes('authentication failed') || err.message.includes('DATABASE_URL')
        ? 'Check your DATABASE_URL in AI Studio Settings' 
        : 'Ensure your database is active'
    });
  }
});

// Proxy for downloading external resources (bypasses CORS)
app.get('/api/download-proxy', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch from source: ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('Proxy failed:', err.message);
    res.status(500).json({ error: 'Failed to proxy resource', details: err.message });
  }
});

// Initialize DB - Seeding handled inside initDb or separately
// Middleware ensures it's called before requests

async function startServer() {
  const PORT = 3000;
}

// Auth API
app.post('/api/auth/signup', async (req, res, next) => {
    let { email, password, displayName } = req.body;
    try {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      email = email.toLowerCase().trim();
      
      // Check if user already exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const id = randomUUID();
      
      await query(
        'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
        [id, email, hashedPassword, displayName]
      );
      
      const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ 
        token, 
        user: { id, email, displayName } 
      });
    } catch (err: any) {
      console.error('Signup error:', err);
      next(err);
    }
});

app.get('/api/auth/me', async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const result = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    res.json({ 
      id: user.id, 
      email: user.email, 
      displayName: user.display_name,
      photoUrl: user.photo_url,
      unlockedModuleIndex: user.unlocked_module_index,
      completed: user.completed
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/auth/login', async (req, res, next) => {
    let { email, password } = req.body;
    try {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      email = email.toLowerCase().trim();
      console.log(`Login attempt for: ${email}`);
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        console.warn(`Login failed: User not found for ${email}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      const user = result.rows[0];
      if (!user.password_hash) {
        console.error(`Login failed: User ${email} has no password_hash`);
        return res.status(500).json({ error: 'User account is improperly configured' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!validPassword) {
        console.warn(`Login failed: Invalid password for ${email}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          displayName: user.display_name,
          photoUrl: user.photo_url,
          unlockedModuleIndex: user.unlocked_module_index,
          completed: user.completed
        } 
      });
    } catch (err: any) {
      next(err);
    }
  });

  // Modules API
  let modulesCache: any[] | null = null;
  let lastCacheTime = 0;
  const CACHE_TTL = 30000; // 30 seconds

  // Lightweight streaming endpoints for base64 storage in database
  app.get('/api/modules/:id/video-data', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await query('SELECT video_url FROM modules WHERE id = $1', [id]);
      if (result.rows.length === 0 || !result.rows[0].video_url) {
        return res.status(404).send('Not Found');
      }
      const val = result.rows[0].video_url;
      if (val.startsWith('data:')) {
        const parts = val.split(',');
        const info = parts[0];
        const base64Data = parts[1];
        const mime = info.match(/:(.*?);/)?.[1] || 'video/mp4';
        const buffer = Buffer.from(base64Data, 'base64');

        const totalLength = buffer.length;
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

          if (start >= totalLength || end >= totalLength) {
            res.setHeader('Content-Range', `bytes */${totalLength}`);
            return res.status(416).send('Requested Range Not Satisfiable');
          }

          const chunksize = (end - start) + 1;
          const chunk = buffer.subarray(start, end + 1);

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${totalLength}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': mime,
            'Cache-Control': 'public, max-age=31536000'
          });
          return res.end(chunk);
        } else {
          res.writeHead(200, {
            'Content-Length': totalLength,
            'Content-Type': mime,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000'
          });
          return res.end(buffer);
        }
      }
      return res.redirect(val);
    } catch (err: any) {
      console.error('Failed to stream video:', err.message);
      res.status(500).send(err.message);
    }
  });

  app.get('/api/modules/:id/pdf-data', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await query('SELECT pdf_url FROM modules WHERE id = $1', [id]);
      if (result.rows.length === 0 || !result.rows[0].pdf_url) {
        return res.status(404).send('Not Found');
      }
      const val = result.rows[0].pdf_url;
      if (val.startsWith('data:')) {
        const parts = val.split(',');
        const info = parts[0];
        const base64Data = parts[1];
        const mime = info.match(/:(.*?);/)?.[1] || 'application/pdf';
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.send(buffer);
      }
      return res.redirect(val);
    } catch (err: any) {
      console.error('Failed to stream PDF:', err.message);
      res.status(500).send(err.message);
    }
  });

  app.get('/api/modules/:id/thumbnail-data', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await query('SELECT thumbnail_url FROM modules WHERE id = $1', [id]);
      if (result.rows.length === 0 || !result.rows[0].thumbnail_url) {
        return res.status(404).send('Not Found');
      }
      const val = result.rows[0].thumbnail_url;
      if (val.startsWith('data:')) {
        const parts = val.split(',');
        const info = parts[0];
        const base64Data = parts[1];
        const mime = info.match(/:(.*?);/)?.[1] || 'image/jpeg';
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.send(buffer);
      }
      return res.redirect(val);
    } catch (err: any) {
      console.error('Failed to stream thumbnail:', err.message);
      res.status(500).send(err.message);
    }
  });

  app.get('/api/modules', async (req, res) => {
    const now = Date.now();
    if (modulesCache && (now - lastCacheTime < CACHE_TTL)) {
      return res.json(modulesCache);
    }

    console.log('[API] GET /api/modules requested (Cache Miss)');
    try {
      const result = await query('SELECT * FROM modules ORDER BY order_index ASC');
      // Map Snake Case to Camel Case for frontend compatibility
      const modules = result.rows.map(row => {
        // Serve local data URLs safely via dedicated streaming endpoints to avoid massive response payload overheads
        const videoUrl = row.video_url && row.video_url.startsWith('data:')
          ? `/api/modules/${row.id}/video-data`
          : row.video_url;
          
        const pdfUrl = row.pdf_url && row.pdf_url.startsWith('data:')
          ? `/api/modules/${row.id}/pdf-data`
          : row.pdf_url;
          
        const thumbnailUrl = row.thumbnail_url && row.thumbnail_url.startsWith('data:')
          ? `/api/modules/${row.id}/thumbnail-data`
          : row.thumbnail_url;

        return {
          id: row.id,
          title: row.title,
          description: row.description,
          type: row.type,
          videoUrl,
          pdfUrl,
          thumbnailUrl,
          order: row.order_index,
          duration: row.duration
        };
      });
      
      if (modules.length > 0) {
        modulesCache = modules;
        lastCacheTime = now;
      }
      
      res.json(modules);
    } catch (err: any) {
      console.error('Failed to fetch modules:', err.message);
      res.status(500).json({ error: 'Failed to fetch modules', details: err.message });
    }
  });

  const invalidateCache = () => {
    modulesCache = null;
    lastCacheTime = 0;
  };

  app.post('/api/modules', async (req, res) => {
    const { id, title, description, type, videoUrl, pdfUrl, thumbnailUrl, order } = req.body;
    try {
      await query(
        'INSERT INTO modules (id, title, description, type, video_url, pdf_url, thumbnail_url, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
        [id, title, description, type, videoUrl, pdfUrl, thumbnailUrl, order]
      );
      invalidateCache();
      res.status(201).json({ message: 'Module created' });
    } catch (err: any) {
      console.error('Failed to create module:', err.message);
      res.status(500).json({ error: 'Failed to create module', details: err.message });
    }
  });

  app.put('/api/modules/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, type, videoUrl, pdfUrl, thumbnailUrl, order } = req.body;
    try {
      await query(
        'UPDATE modules SET title = $1, description = $2, type = $3, video_url = $4, pdf_url = $5, thumbnail_url = $6, order_index = $7 WHERE id = $8',
        [title, description, type, videoUrl, pdfUrl, thumbnailUrl, order, id]
      );
      invalidateCache();
      res.json({ message: 'Module updated' });
    } catch (err: any) {
      console.error('Failed to update module:', err.message);
      res.status(500).json({ error: 'Failed to update module', details: err.message });
    }
  });

  app.delete('/api/modules/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await query('DELETE FROM modules WHERE id = $1', [id]);
      invalidateCache();
      res.json({ message: 'Module deleted' });
    } catch (err: any) {
      console.error('Failed to delete module:', err.message);
      res.status(500).json({ error: 'Failed to delete module', details: err.message });
    }
  });

  // User Progress API
  app.get('/api/users/:id', async (req, res) => {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const row = result.rows[0];
      res.json({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        photoUrl: row.photo_url,
        unlockedModuleIndex: row.unlocked_module_index,
        completed: row.completed,
        completedAt: row.completed_at
      });
    } catch (err: any) {
      console.error('Failed to fetch user:', err.message);
      res.status(500).json({ error: 'Failed to fetch user progress', details: err.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { id, email, displayName, photoUrl } = req.body;
    try {
      await query(
        'INSERT INTO users (id, email, display_name, photo_url) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [id, email, displayName, photoUrl]
      );
      res.status(201).json({ message: 'User created/verified' });
    } catch (err: any) {
      console.error('Failed to handle user:', err.message);
      res.status(500).json({ error: 'Failed to handle user', details: err.message });
    }
  });

  app.put('/api/users/:id/progress', async (req, res) => {
    const { unlockedModuleIndex, completed, completedAt } = req.body;
    try {
      await query(
        'UPDATE users SET unlocked_module_index = $1, completed = $2, completed_at = $3 WHERE id = $4',
        [unlockedModuleIndex, completed, completedAt, req.params.id]
      );
      res.json({ message: 'Progress updated' });
    } catch (err: any) {
      console.error('Failed to update progress:', err.message);
      res.status(500).json({ error: 'Failed to update progress', details: err.message });
    }
  });

  app.put('/api/users/:id/profile', async (req, res) => {
    const { displayName, photoUrl } = req.body;
    try {
      await query(
        'UPDATE users SET display_name = $1, photo_url = $2 WHERE id = $3',
        [displayName, photoUrl, req.params.id]
      );
      res.json({ message: 'Profile updated' });
    } catch (err: any) {
      console.error('Failed to update profile:', err.message);
      res.status(500).json({ error: 'Failed to update profile', details: err.message });
    }
  });

  app.put('/api/users/:id/password', async (req, res) => {
    const { password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, req.params.id]
      );
      res.json({ message: 'Password updated' });
    } catch (err: any) {
      console.error('Failed to update password:', err.message);
      res.status(500).json({ error: 'Failed to update password', details: err.message });
    }
  });

  // Admin Check API
  app.get('/api/admins/:email', async (req, res) => {
    try {
      const result = await query('SELECT * FROM admins WHERE email = $1', [req.params.email]);
      res.json({ isAdmin: result.rows.length > 0 });
    } catch (err: any) {
      console.error('Failed to check admin status:', err.message);
      res.status(500).json({ error: 'Failed to check admin status', details: err.message });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const result = await query('SELECT * FROM users ORDER BY email ASC');
      const users = result.rows.map(row => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        photoUrl: row.photo_url,
        unlockedModuleIndex: row.unlocked_module_index,
        completed: row.completed,
        completedAt: row.completed_at
      }));
      res.json(users);
    } catch (err: any) {
      console.error('Failed to fetch students:', err.message);
      res.status(500).json({ error: 'Failed to fetch students', details: err.message });
    }
  });

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || 500;
  res.status(status).json({ 
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

const PORT = 3000;
if (!process.env.VERCEL) {
  setupVite()
    .then(() => startServer())
    .then(() => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('Critical: Failed to start server:', err);
      process.exit(1);
    });
}
