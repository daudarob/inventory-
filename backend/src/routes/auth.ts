import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import redisClient from '../config/redis.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { verifyIdToken } from '../config/firebase.js';

const router = express.Router();

// Exchange Google ID token for JWT
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    const decodedToken = await verifyIdToken(idToken);

    const userId = decodedToken.uid;
    const email = decodedToken.email!;
    const displayName = decodedToken.name || decodedToken.email;

    let userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        requiresRegistration: true,
        userId,
        email,
        displayName
      });
    }

    const user = userResult.rows[0];

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRY || '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );

    await redisClient.set(`refresh_token:${user.id}`, refreshToken, { EX: 60 * 60 * 24 * 7 });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        isAdmin: user.role === 'admin'
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed', code: 'AUTH_ERROR' });
  }
});

// Complete user registration
router.post('/register', async (req, res) => {
  try {
    const { idToken, role, adminAuthKey } = req.body;

    const decodedToken = await verifyIdToken(idToken);
    
    const userId = decodedToken.uid;
    const email = decodedToken.email!;
    const displayName = decodedToken.name || decodedToken.email;

    if (role === 'admin') {
      if (adminAuthKey !== process.env.ADMIN_AUTH_KEY) {
        return res.status(403).json({ error: 'Invalid admin auth key', code: 'INVALID_ADMIN_KEY' });
      }
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        'INSERT INTO users (id, email, display_name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [userId, email, displayName, role]
      );

      if (role === 'admin') {
        const authKeyHash = await bcrypt.hash(adminAuthKey, 10);
        await client.query(
          'INSERT INTO admins (user_id, auth_key_hash) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
          [userId, authKeyHash]
        );
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const accessToken = jwt.sign(
      { userId, email, role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRY || '1h' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );

    await redisClient.set(`refresh_token:${userId}`, refreshToken, { EX: 60 * 60 * 24 * 7 });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        displayName,
        role,
        isAdmin: role === 'admin'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', code: 'REGISTRATION_ERROR' });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`);

    if (storedToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const user = userResult.rows[0];

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRY || '1h' }
    );

    res.json({ accessToken });

  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await redisClient.del(`refresh_token:${req.user!.userId}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed', code: 'LOGOUT_ERROR' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userResult = await pool.query('SELECT id, email, display_name, role FROM users WHERE id = $1', [req.user!.userId]);
    const user = userResult.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      isAdmin: user.role === 'admin'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user', code: 'USER_FETCH_ERROR' });
  }
});

export default router;