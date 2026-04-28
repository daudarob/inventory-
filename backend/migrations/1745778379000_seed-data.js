exports.up = async pgm => {
  // Seed users
  await pgm.sql(`
    INSERT INTO users (id, email, display_name, role) VALUES
    ('a1b2c3d4-1234-5678-90ab-cdef01234567', 'admin@vaultstock.com', 'Admin User', 'admin'),
    ('b2c3d4e5-2345-6789-01bc-def012345678', 'shop@vaultstock.com', 'Shop Keeper', 'shop')
    ON CONFLICT DO NOTHING;
  `);

  await pgm.sql(`
    INSERT INTO admins (user_id, auth_key_hash) VALUES
    ('a1b2c3d4-1234-5678-90ab-cdef01234567', '$2a$10$EixZaY3Zs7rQz1aQl7X9HOPuO81z7G5d3F2e1D0c9B8A7F6E5D4C3')
    ON CONFLICT DO NOTHING;
  `);

  // Seed products
  await pgm.sql(`
    INSERT INTO products (sku, name, category, sizes, wholesale_price, retail_price, stock, min_stock_alert) VALUES
    ('MN-TX-001', 'Classic Cotton T-Shirt', 'Men', ARRAY['S', 'M', 'L', 'XL'], 12.50, 24.99, 145, 10),
    ('WM-DR-002', 'Summer Floral Dress', 'Women', ARRAY['XS', 'S', 'M', 'L'], 18.75, 39.99, 87, 5),
    ('KD-JS-003', 'Kids Denim Jeans', 'Kids', ARRAY['2T', '3T', '4T', '5T', '6'], 9.25, 19.99, 210, 15),
    ('MN-JK-004', 'Denim Jacket', 'Men', ARRAY['M', 'L', 'XL', 'XXL'], 28.00, 59.99, 32, 5),
    ('WM-BL-005', 'Formal Blouse', 'Women', ARRAY['S', 'M', 'L', 'XL'], 15.00, 34.99, 68, 8)
    ON CONFLICT (sku) DO NOTHING;
  `);

  // Seed clients
  await pgm.sql(`
    INSERT INTO clients (name, type, location, phone, credit_limit, balance) VALUES
    ('City Mall Retail', 'Retail', 'Nairobi CBD', '+254700000001', 50000.00, 12500.00),
    ('Fashion Wholesale Ltd', 'Wholesale', 'Mombasa', '+254700000002', 150000.00, 45000.00),
    ('Local Shop Express', 'Retail', 'Kisumu', '+254700000003', 20000.00, 0.00)
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = pgm => {
  pgm.sql("DELETE FROM clients WHERE phone IN ('+254700000001', '+254700000002', '+254700000003')");
  pgm.sql("DELETE FROM products WHERE sku IN ('MN-TX-001', 'WM-DR-002', 'KD-JS-003', 'MN-JK-004', 'WM-BL-005')");
  pgm.sql("DELETE FROM admins WHERE user_id = 'a1b2c3d4-1234-5678-90ab-cdef01234567'");
  pgm.sql("DELETE FROM users WHERE id IN ('a1b2c3d4-1234-5678-90ab-cdef01234567', 'b2c3d4e5-2345-6789-01bc-def012345678')");
};