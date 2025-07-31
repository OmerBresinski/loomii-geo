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

// Security middleware
app.use(helmet());

// CORS configuration - get allowed origins from FRONTEND_URLS environment variable
console.log('🔍 Raw FRONTEND_URLS:', JSON.stringify(process.env.FRONTEND_URLS));

const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(/[,;]/)
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0)
  : ['http://localhost:3000', 'http://localhost:5173']; // fallback for development

console.log('🌐 Allowed CORS origins:', allowedOrigins);
console.log('🌐 Origins as JSON:', JSON.stringify(allowedOrigins));

// Most permissive CORS setup for testing
app.use(cors({
  origin: "*", // Allow all origins
  credentials: false, // Disable credentials to be maximally permissive
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
}));

console.log('🚨 Using MAXIMALLY PERMISSIVE CORS for testing - this should work with any origin!');

// Handle preflight requests
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// Rate limiting - disabled in development
if (process.env.ENVIRONMENT !== 'development') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT || '100'), // limit each IP to 100 requests per windowMs
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

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
