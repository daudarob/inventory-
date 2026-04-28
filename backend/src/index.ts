import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pool, query } from './config/database.js';
import { connectRedis } from './config/redis.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.APP_URL,
    methods: ['GET', 'POST']
  }
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({ origin: process.env.APP_URL }));
app.use(express.json());
app.use('/api/', limiter);

// Import routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import clientRoutes from './routes/clients.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import insightRoutes from './routes/insights.js';
import analyticsRoutes from './routes/analytics.js';
import logRoutes from './routes/logs.js';
import notificationRoutes from './routes/notifications.js';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/insights', insightRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/logs', logRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', redis: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: 'Database connection failed' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await connectRedis();
    await pool.connect();
    console.log('Database connected successfully');
    
    server.listen(PORT, () => {
      console.log(`🚀 VaultStock Backend running on port ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api/`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, server, io };