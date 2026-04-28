exports.up = pgm => {
  // Users table
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true },
    email: { type: 'text', notNull: true, unique: true },
    display_name: { type: 'text' },
    role: { type: 'text', notNull: true, check: "role IN ('admin', 'shop')" },
    created_at: { type: 'timestamptz', default: pgm.func('now()') }
  });

  // Admins table
  pgm.createTable('admins', {
    user_id: { type: 'uuid', primaryKey: true, references: '"users"(id)' },
    auth_key_hash: { type: 'text', notNull: true },
    authorized_at: { type: 'timestamptz', default: pgm.func('now()') }
  });

  // Products table
  pgm.createTable('products', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    sku: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(200)', notNull: true },
    category: { type: 'text', notNull: true, check: "category IN ('Men', 'Women', 'Kids')" },
    sizes: { type: 'text[]' },
    wholesale_price: { type: 'numeric(12,2)', notNull: true, check: 'wholesale_price >= 0' },
    retail_price: { type: 'numeric(12,2)', notNull: true, check: 'retail_price >= 0' },
    stock: { type: 'integer', notNull: true, default: 0 },
    min_stock_alert: { type: 'integer', default: 10 },
    updated_at: { type: 'timestamptz', default: pgm.func('now()') }
  });

  // Clients table
  pgm.createTable('clients', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(200)', notNull: true },
    type: { type: 'text', notNull: true, check: "type IN ('Wholesale', 'Retail')" },
    location: { type: 'text' },
    phone: { type: 'text' },
    credit_limit: { type: 'numeric(12,2)', default: 0 },
    balance: { type: 'numeric(12,2)', default: 0 },
    created_at: { type: 'timestamptz', default: pgm.func('now()') }
  });

  // Orders table
  pgm.createTable('orders', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    shopkeeper_id: { type: 'uuid', notNull: true, references: '"users"(id)' },
    shopkeeper_name: { type: 'text' },
    client_id: { type: 'uuid', references: '"clients"(id)' },
    client_name: { type: 'text' },
    items: { type: 'jsonb', notNull: true },
    total: { type: 'numeric(12,2)', notNull: true, check: 'total >= 0' },
    type: { type: 'text', notNull: true, check: "type IN ('Wholesale', 'Retail')" },
    payment_status: { type: 'text', notNull: true, check: "payment_status IN ('Paid', 'Partial', 'Awaiting')" },
    timestamp: { type: 'timestamptz', default: pgm.func('now()') }
  });

  // Payments table
  pgm.createTable('payments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    shopkeeper_id: { type: 'uuid', notNull: true, references: '"users"(id)' },
    client_id: { type: 'uuid', notNull: true, references: '"clients"(id)' },
    order_id: { type: 'uuid', references: '"orders"(id)' },
    amount: { type: 'numeric(12,2)', notNull: true, check: 'amount > 0' },
    method: { type: 'text', notNull: true, check: "method IN ('M-Pesa', 'Cash', 'Bank')" },
    reference: { type: 'text' },
    timestamp: { type: 'timestamptz', default: pgm.func('now()') }
  });

  // Logs table
  pgm.createTable('logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    shopkeeper_id: { type: 'uuid', notNull: true, references: '"users"(id)' },
    shopkeeper_name: { type: 'text' },
    action: { type: 'text', notNull: true },
    details: { type: 'text' },
    timestamp: { type: 'timestamptz', default: pgm.func('now()') }
  });

  // Insights table
  pgm.createTable('insights', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    type: { type: 'text', notNull: true, check: "type IN ('alert', 'insight', 'warn')" },
    message: { type: 'text', notNull: true },
    timestamp: { type: 'timestamptz', default: pgm.func('now()') }
  });

  // Notifications table
  pgm.createTable('notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: '"users"(id)' },
    title: { type: 'varchar(200)', notNull: true },
    message: { type: 'varchar(1000)', notNull: true },
    type: { type: 'text', notNull: true, check: "type IN ('info', 'success', 'warning', 'error')" },
    read: { type: 'boolean', notNull: true, default: false },
    timestamp: { type: 'timestamptz', default: pgm.func('now()') }
  });

  // Indexes
  pgm.createIndex('products', 'sku');
  pgm.createIndex('orders', 'shopkeeper_id');
  pgm.createIndex('orders', 'client_id');
  pgm.createIndex('payments', 'order_id');
  pgm.createIndex('logs', 'shopkeeper_id');
  pgm.createIndex('notifications', 'user_id');
};

exports.down = pgm => {
  pgm.dropTable('notifications');
  pgm.dropTable('insights');
  pgm.dropTable('logs');
  pgm.dropTable('payments');
  pgm.dropTable('orders');
  pgm.dropTable('clients');
  pgm.dropTable('products');
  pgm.dropTable('admins');
  pgm.dropTable('users');
};