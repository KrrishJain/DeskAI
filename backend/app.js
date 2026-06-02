import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ping } from './db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

/* ──────────────────────────────────────────────
   Attach socket.io to request
────────────────────────────────────────────── */

app.use((req, _res, next) => {
  req.io = io;
  next();
});

/* ──────────────────────────────────────────────
   Socket connection
────────────────────────────────────────────── */

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('join:user', (userId) => {
    socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

/* ──────────────────────────────────────────────
   Security
────────────────────────────────────────────── */

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

/* ──────────────────────────────────────────────
   Rate limit
────────────────────────────────────────────── */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);

/* ──────────────────────────────────────────────
   Middleware
────────────────────────────────────────────── */

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ──────────────────────────────────────────────
   API ROUTES
────────────────────────────────────────────── */

app.use('/api', routes);

/* ──────────────────────────────────────────────
   Health Check
────────────────────────────────────────────── */

app.get('/health', async (_req, res) => {
  try {
    const dbTime = await ping();
    res.json({
      status: 'ok',
      db: dbTime,
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: err.message,
    });
  }
});

/* ──────────────────────────────────────────────
   404
────────────────────────────────────────────── */

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* ──────────────────────────────────────────────
   Error Handler
────────────────────────────────────────────── */

app.use(errorHandler);

export { app, httpServer, io };