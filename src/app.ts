import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
const cookieParser = require('cookie-parser');
import dotenv from 'dotenv';

import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();

app.set('trust proxy', true);

// Security middleware - configure helmet for production HTTPS
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts:
      process.env.NODE_ENV === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false, // Disable HSTS in development
  })
);

// CORS configuration - get allowed origins from FRONTEND_URLS environment variable
console.log('🔍 Raw FRONTEND_URLS:', JSON.stringify(process.env.FRONTEND_URLS));

const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(/[,;]/)
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0)
  : ['http://localhost:3000', 'http://localhost:5173']; // fallback for development

console.log('🌐 Allowed CORS origins:', allowedOrigins);
console.log('🌐 Origins as JSON:', JSON.stringify(allowedOrigins));

// CORS with specific origin for credentials support
app.use(
  cors({
    origin: function (origin, callback) {
      console.log('🔍 CORS request from origin:', origin);
      console.log('🔍 Allowed origins:', allowedOrigins);

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log('✅ Allowing request with no origin');
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        console.log('✅ Origin allowed:', origin);
        return callback(null, origin); // Return the specific origin, not true!
      } else {
        console.log('❌ CORS blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true, // Enable credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-HTTP-Method-Override',
    ],
    optionsSuccessStatus: 200,
  })
);

console.log('🔧 Using specific origin CORS for credentials support');

// Handle preflight requests
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// Rate limiting - disabled in development
if (process.env.ENVIRONMENT !== 'development') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT || '200'), // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
    },
  });
  app.use('/api', limiter);
  console.log('✓ Rate limiting enabled');
} else {
  console.log('⚠ Rate limiting disabled for development environment');
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        },
      },
    })
  );
}

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Loomii Geo API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Add error logging middleware before error handlers
app.use((err: any, req: any, res: any, next: any) => {
  console.error('🔥 Server Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    protocol: req.protocol,
    secure: req.secure,
  });
  next(err);
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
