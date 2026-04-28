import pool from '../config/database.js';
import { io } from '../index.js';

export async function createOrder(orderData: any, userId: string, userName: string) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check stock for all items
    for (const item of orderData.items) {
      const productResult = await client.query(
        'SELECT stock, name FROM products WHERE id = $1 FOR UPDATE',
        [item.productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const product = productResult.rows[0];

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}: ${product.stock} available, ${item.quantity} requested`);
      }
    }

    // Deduct stock
    for (const item of orderData.items) {
      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.productId]
      );
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (shopkeeper_id, shopkeeper_name, client_id, client_name, items, total, type, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Awaiting')
       RETURNING *`,
      [userId, userName, orderData.clientId, orderData.clientName, orderData.items, orderData.total, orderData.type]
    );

    const order = orderResult.rows[0];

    // Create audit log
    await client.query(
      `INSERT INTO logs (shopkeeper_id, shopkeeper_name, action, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, userName, 'Created Order', `Order #${order.id} created with ${orderData.items.length} items, total: ${orderData.total}`]
    );

    await client.query('COMMIT');

    io.emit('order:created', order);

    return order;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOrderPaymentStatus(orderId: string) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const paymentsResult = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE order_id = $1',
      [orderId]
    );

    const totalPaid = parseFloat(paymentsResult.rows[0].total_paid);

    const orderResult = await client.query('SELECT total FROM orders WHERE id = $1', [orderId]);
    const orderTotal = parseFloat(orderResult.rows[0].total);

    let paymentStatus;
    if (totalPaid >= orderTotal) {
      paymentStatus = 'Paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'Partial';
    } else {
      paymentStatus = 'Awaiting';
    }

    await client.query(
      'UPDATE orders SET payment_status = $1 WHERE id = $2',
      [paymentStatus, orderId]
    );

    await client.query('COMMIT');

    return paymentStatus;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}