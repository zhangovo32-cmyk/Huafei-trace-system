PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  specs TEXT,
  weight TEXT,
  batch_no TEXT,
  production_date TEXT,
  manufacturer TEXT,
  image_url TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  product_id INTEGER NOT NULL,
  scan_count INTEGER NOT NULL DEFAULT 0,
  first_scan_time TEXT,
  last_scan_time TEXT,
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'risk', 'disabled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  scan_time TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_codes_code ON codes(code);
CREATE INDEX IF NOT EXISTS idx_codes_product_id ON codes(product_id);
CREATE INDEX IF NOT EXISTS idx_codes_status ON codes(status);
CREATE INDEX IF NOT EXISTS idx_scan_logs_code ON scan_logs(code);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_time ON scan_logs(scan_time);

INSERT OR IGNORE INTO products (
  id,
  name,
  brand,
  specs,
  weight,
  batch_no,
  production_date,
  manufacturer,
  image_url,
  description
) VALUES (
  1,
  '高效水溶肥示例产品',
  '三环',
  'N-P-K >= 52%；水分 <= 0.5%；适用于多种经济作物追肥场景',
  '25 kg',
  'HL 251220 2A',
  '2026-01-16',
  '云南云天化红磷化工有限公司',
  '/assets/product-bag.png',
  '这里是产品详情占位文案，可替换为真实的产品介绍、适用作物、施用方法和注意事项。'
);

INSERT OR IGNORE INTO codes (
  code,
  product_id,
  scan_count,
  status
) VALUES (
  '7532087070511313',
  1,
  0,
  'normal'
);
