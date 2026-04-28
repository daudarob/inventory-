--
-- VaultStock Database Migration 001 - Core Schema
--

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Set timezone
SET TIMEZONE = 'Africa/Nairobi';

-- Trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'shop');
CREATE TYPE product_category AS ENUM ('Men', 'Women', 'Kids');
CREATE TYPE client_type AS ENUM ('Wholesale', 'Retail');
CREATE TYPE payment_status AS ENUM ('Paid', 'Partial', 'Awaiting');
CREATE TYPE order_type AS ENUM ('Wholesale', 'Retail');
CREATE TYPE payment_method AS ENUM ('M-Pesa', 'Cash', 'Bank');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');
CREATE TYPE insight_type AS ENUM ('alert', 'insight', 'warn');
CREATE TYPE stock_movement_reason AS ENUM ('order', 'restock', 'adjustment', 'return', 'write_off');

-- Users table (Firebase UID primary key)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  display_name TEXT,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Admins table
CREATE TABLE admins (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  auth_key_hash TEXT NOT NULL,
  granted_by TEXT DEFAULT 'System Bootstrap',
  authorized_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL CHECK (length(sku) <= 50),
  name TEXT NOT NULL CHECK (length(name) <= 200),
  category product_category NOT NULL,
  sizes TEXT[] NOT NULL DEFAULT '{}',
  wholesale_price NUMERIC(12,2) NOT NULL CHECK (wholesale_price >= 0),
  retail_price NUMERIC(12,2) NOT NULL CHECK (retail_price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock_alert INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_products_search ON products USING gin (to_tsvector('english', name || ' ' || sku));
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_stock ON products (stock);
CREATE INDEX idx_products_is_active ON products (is_active);
CREATE INDEX idx_products_updated_at ON products (updated_at DESC);

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) <= 200),
  type client_type NOT NULL,
  location TEXT,
  phone TEXT,
  credit_limit NUMERIC(12,2) DEFAULT 0 CHECK (credit_limit >= 0),
  balance NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_clients_name_trgm ON clients USING gin (name gin_trgm_ops);
CREATE INDEX idx_clients_type ON clients (type);
CREATE INDEX idx_clients_is_active ON clients (is_active);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopkeeper_id TEXT NOT NULL REFERENCES users(id),
  shopkeeper_name TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  items JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_array_length(items) > 0),
  total NUMERIC(12,2) CHECK (total >= 0),
  type order_type NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'Awaiting',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_orders_shopkeeper_id ON orders (shopkeeper_id);
CREATE INDEX idx_orders_client_id ON orders (client_id);
CREATE INDEX idx_orders_payment_status ON orders (payment_status);
CREATE INDEX idx_orders_type ON orders (type);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX idx_orders_items ON orders USING gin (items);

-- Order item snapshots (append-only analytics ledger)
CREATE TABLE order_item_snapshots (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  size TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  order_type order_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table (append-only financial ledger)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopkeeper_id TEXT REFERENCES users(id),
  client_id UUID REFERENCES clients(id),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock movements (full inventory audit trail)
CREATE TABLE stock_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  delta INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reason stock_movement_reason NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
