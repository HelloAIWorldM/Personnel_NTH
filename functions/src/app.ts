import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import notifyRoutes from './routes/notify';
import guildRoutes from './routes/guild';

const app: Express = express();
app.set('trust proxy', 1);

// 1. Strict CORS Middleware
const allowedOrigins = [
  'https://sapxepnhansunth.web.app',
  'https://sapxepnhansunth.firebaseapp.com',
  ...(process.env.NODE_ENV !== 'production'
    ? [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ]
    : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (ví dụ server-to-server, curl nội bộ) hoặc nằm trong whitelist
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 2. Parse JSON & URL-encoded payloads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 3. Security & Anti-Sniffing headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// 4. Healthcheck Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'NTH Raid Personnel Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'NTH Raid Personnel Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 5. Mount Routes (hỗ trợ cả khi rewrite từ /api hoặc gọi trực tiếp)
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use('/notify', notifyRoutes);
app.use('/api/notify', notifyRoutes);

app.use('/guild', guildRoutes);
app.use('/api/guild', guildRoutes);

// 6. 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// 7. Global Error Handler - Production-safe with environment-aware stack traces
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = Number(err.statusCode || err.status) || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  // Luôn in chi tiết lỗi trên máy chủ để developer kiểm tra logs
  console.error('[API Server Error]:', err);

  // Chuẩn hóa phản hồi an toàn trả về cho client:
  // Ở Production: tuyệt đối ẩn stack trace để bảo vệ cấu trúc server (Information Disclosure)
  // Ở Dev: giữ stack trace để debug nhanh
  const responseError = {
    statusCode,
    error: statusCode >= 500 ? 'Internal Server Error' : (err.name || 'Bad Request'),
    message: err.message || (statusCode >= 500 ? 'Đã có lỗi xảy ra trên hệ thống' : 'Yêu cầu không hợp lệ'),
    timestamp: new Date().toISOString(),
    ...(isDev && { stack: err.stack }),
  };

  res.status(statusCode).json(responseError);
});

export default app;
