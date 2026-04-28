import pool from '../config/database.js';
import { io } from '../index.js';
import { updateOrderPaymentStatus } from './orderService.js';

export async function createPayment(paymentData: any, userId: string, userName: string) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create payment
    const paymentResult = await client.query(
      `INSERT INTO payments (shopkeeper_id, client_id, order_id, amount, method, reference)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, paymentData.clientId, paymentData.orderId, paymentData.amount, paymentData.method, paymentData.reference]
    );

    const payment = paymentResult.rows[0];

    // Update order payment status
    if (paymentData.orderId) {
      await updateOrderPaymentStatus(paymentData.orderId);
    }

    // Update client balance
    await client.query(
      'UPDATE clients SET balance = balance - $1 WHERE id = $2',
      [paymentData.amount, paymentData.clientId]
    );

    // Create audit log
    await client.query(
      `INSERT INTO logs (shopkeeper_id, shopkeeper_name, action, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, userName, 'Recorded Payment', `Payment of ${paymentData.amount} recorded for client ${paymentData.clientId}`]
    );

    await client.query('COMMIT');

    io.emit('payment:created', payment);

    return payment;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}