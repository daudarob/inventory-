import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';

const router = express.Router();
router.use(authMiddleware);

// Get all clients
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients', code: 'CLIENTS_FETCH_ERROR' });
  }
});

// Get single client
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client', code: 'CLIENT_FETCH_ERROR' });
  }
});

// Create client
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, type, location, phone, credit_limit } = req.body;

    const result = await pool.query(
      `INSERT INTO clients (name, type, location, phone, credit_limit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, type, location, phone, credit_limit || 0]
    );

    const client = result.rows[0];
    io.emit('client:created', client);

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create client', code: 'CLIENT_CREATE_ERROR' });
  }
});

// Update client
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, type, location, phone, credit_limit, balance } = req.body;

    const result = await pool.query(
      `UPDATE clients SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        location = COALESCE($3, location),
        phone = COALESCE($4, phone),
        credit_limit = COALESCE($5, credit_limit),
        balance = COALESCE($6, balance)
      WHERE id = $7 RETURNING *`,
      [name, type, location, phone, credit_limit, balance, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
    }

    const client = result.rows[0];
    io.emit('client:updated', client);

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client', code: 'CLIENT_UPDATE_ERROR' });
  }
});

// Delete client (Admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
    }

    io.emit('client:deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client', code: 'CLIENT_DELETE_ERROR' });
  }
});

export default router;