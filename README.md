# Database Schema Documentation

This application uses **Neon PostgreSQL** for persistent data storage and a custom auth system.

## SQL Schema (DDL)

```sql
-- Progress tracking and user accounts
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY, -- Custom ID
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  unlocked_module_index INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP
);

-- Administrative whitelist
CREATE TABLE admins (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL
);

-- Curriculum modules (Videos/PDFs)
CREATE TABLE modules (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(10) CHECK (type IN ('video', 'pdf')),
  video_url TEXT,
  pdf_url TEXT,
  thumbnail_url TEXT,
  order_index INTEGER NOT NULL,
  duration INTEGER -- Duration in seconds
);
```

## Setup Requirements

1. **Neon Database**: Ensure `DATABASE_URL` is configured in your environment.
2. **Auth Secret**: `JWT_SECRET` is required for signing authentication tokens.
