import Database from "better-sqlite3";
import path from "path";

// On Railway, use /data volume (set RAILWAY_VOLUME_MOUNT_PATH=/data in env vars)
// Locally, use the project's data/ folder
const DB_PATH = process.env.DB_PATH ||
  (process.env.RAILWAY_ENVIRONMENT
    ? "/data/mass-info.db"
    : path.join(process.cwd(), "data", "mass-info.db"));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS price_cache (
        ticker TEXT NOT NULL,
        date TEXT NOT NULL,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        volume INTEGER,
        PRIMARY KEY (ticker, date)
      );
      CREATE TABLE IF NOT EXISTS news_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT,
        source TEXT,
        published_at TEXT,
        sentiment_score REAL,
        image_url TEXT,
        fetched_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT UNIQUE NOT NULL,
        added_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_price_ticker ON price_cache(ticker);
      CREATE INDEX IF NOT EXISTS idx_news_ticker ON news_cache(ticker);
      CREATE INDEX IF NOT EXISTS idx_news_fetched ON news_cache(fetched_at);

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS portfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cash_balance REAL NOT NULL DEFAULT 100000.00,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticker TEXT NOT NULL,
        side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        executed_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
      CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(user_id, ticker);

      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticker TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        avg_cost REAL NOT NULL DEFAULT 0,
        UNIQUE(user_id, ticker)
      );
      CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
    `);

    // Add user_id to watchlist if missing (migration)
    try {
      db.exec(`ALTER TABLE watchlist ADD COLUMN user_id INTEGER`);
    } catch {
      // column already exists
    }
  }
  return db;
}
