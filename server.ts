import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { initDb, query } from './src/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const app = express();
export { app };

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Middleware to ensure DB is initialized
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    try {
      await initDb();
      next();
    } catch (err: any) {
      console.error('DB Initialization middleware failed:', err.message);
      res.status(500).json({ error: 'Database initialization failed', details: err.message });
    }
  } else {
    next();
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
      email = email.toLowerCase().trim();
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = Math.random().toString(36).substring(2, 15);
      
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
      next(err);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    let { email, password } = req.body;
    try {
      email = email.toLowerCase().trim();
      console.log(`Login attempt for: ${email}`);
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        console.warn(`Login failed: User not found for ${email}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      const user = result.rows[0];
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
  app.get('/api/modules', async (req, res) => {
    try {
      const result = await query('SELECT * FROM modules ORDER BY order_index ASC');
      // Map Snake Case to Camel Case for frontend compatibility
      const modules = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        videoUrl: row.video_url,
        pdfUrl: row.pdf_url,
        thumbnailUrl: row.thumbnail_url,
        order: row.order_index,
        duration: row.duration
      }));
      res.json(modules);
    } catch (err: any) {
      console.error('Failed to fetch modules:', err.message);
      res.status(500).json({ error: 'Failed to fetch modules', details: err.message });
    }
  });

  app.post('/api/modules', async (req, res) => {
    const { id, title, description, type, videoUrl, pdfUrl, thumbnailUrl, order } = req.body;
    try {
      await query(
        'INSERT INTO modules (id, title, description, type, video_url, pdf_url, thumbnail_url, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
        [id, title, description, type, videoUrl, pdfUrl, thumbnailUrl, order]
      );
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
        photoURL: row.photo_url,
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
  setupVite().then(() => {
    startServer().then(() => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
      });
    });
  });
}
