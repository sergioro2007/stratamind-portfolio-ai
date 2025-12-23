-- Profiles (Local Single User Mode)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT
);

-- Institutions
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  total_value REAL DEFAULT 0,
  cash_balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- Portfolio Slices (Recursive Strategy Tree)
CREATE TABLE IF NOT EXISTS portfolio_slices (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  parent_id TEXT,
  type TEXT CHECK(type IN ('GROUP', 'HOLDING')) NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT,
  target_allocation REAL DEFAULT 0,
  current_value REAL DEFAULT 0,
  strategy_prompt TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY(parent_id) REFERENCES portfolio_slices(id) ON DELETE CASCADE
);
-- Performance tracking: snapshots of portfolio value over time
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  total_value REAL NOT NULL,
  cash_balance REAL NOT NULL,
  holdings_value REAL NOT NULL,
  day_change REAL,
  day_change_percent REAL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_account ON performance_snapshots(account_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON performance_snapshots(timestamp);
