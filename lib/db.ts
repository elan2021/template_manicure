import "server-only";

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDirectory = join(process.cwd(), "data");
const databasePath = join(dataDirectory, "lemail-studio.db");

type GlobalWithDatabase = typeof globalThis & { database?: DatabaseSync };
const globalWithDatabase = globalThis as GlobalWithDatabase;

function ensureColumn(database: DatabaseSync, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function seedDatabase(database: DatabaseSync) {
  // New studios begin empty. Data is created only through the application.
}

function createDatabase() {
  mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(databasePath);

  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS studios (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      whatsapp TEXT,
      deposit_type TEXT NOT NULL DEFAULT 'fixed',
      deposit_value INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS professionals (
      id INTEGER PRIMARY KEY,
      studio_id INTEGER NOT NULL REFERENCES studios(id),
      name TEXT NOT NULL,
      whatsapp TEXT,
      specialty TEXT,
      commission_rate INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY,
      studio_id INTEGER NOT NULL REFERENCES studios(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
      duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY,
      studio_id INTEGER NOT NULL REFERENCES studios(id),
      client_name TEXT NOT NULL,
      client_phone TEXT,
      starts_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'pending_deposit', 'completed', 'cancelled')),
      professional_id INTEGER REFERENCES professionals(id),
      service_id INTEGER REFERENCES services(id),
      deposit_cents INTEGER NOT NULL DEFAULT 0 CHECK(deposit_cents >= 0),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS appointments_studio_starts_at ON appointments(studio_id, starts_at);
    CREATE INDEX IF NOT EXISTS services_studio_active ON services(studio_id, active);

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      studio_id INTEGER NOT NULL REFERENCES studios(id),
      phone TEXT NOT NULL UNIQUE,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'owner' CHECK(role IN ('owner', 'professional', 'reception')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_challenges (
      id INTEGER PRIMARY KEY,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS public_testimonials (
      id INTEGER PRIMARY KEY,
      studio_id INTEGER NOT NULL REFERENCES studios(id),
      client_name TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS public_testimonials_studio_status ON public_testimonials(studio_id, status, created_at DESC);
  `);

  ensureColumn(database, "studios", "settings_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(database, "appointments", "payment_status", "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumn(database, "professionals", "availability_json", "TEXT NOT NULL DEFAULT '{\"days\":[1,2,3,4,5,6],\"start\":\"09:00\",\"end\":\"19:00\"}'");
  ensureColumn(database, "services", "image_url", "TEXT");
  ensureColumn(database, "public_testimonials", "rating", "INTEGER NOT NULL DEFAULT 5");

  seedDatabase(database);
  database.exec("UPDATE appointments SET payment_status = 'deposit_paid' WHERE deposit_cents > 0 AND payment_status = 'pending'");
  return database;
}

export const db = globalWithDatabase.database ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalWithDatabase.database = db;
}
