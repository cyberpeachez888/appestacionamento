import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import scheduledBackupService from './services/scheduledBackupService.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();

// ✅ ADICIONAR ESTA LINHA
app.set('trust proxy', 1); // Trust first proxy (Render)

// CORS configuration for production (Vercel + Render + Local)
const allowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  // Vercel deployments
  'https://appestacionamento-f1pr-a3mk2fpyq-cyberpeachezs-projects.vercel.app',
  'https://appestacionamento-v1-4537vs52d-cyberpeachezs-projects.vercel.app',
  // Render backend
  'https://theproparking-backend-1rxk.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any Vercel preview deployment
    if (origin.match(/^https:\/\/appestacionamento.*\.vercel\.app$/)) {
      return callback(null, true);
    }
    
    // Allow localhost with any port
    if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow local network IPs (for development)
    const localNetworkPatterns = [
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/
    ];
    
    const isLocalNetwork = localNetworkPatterns.some(pattern => pattern.test(origin));
    if (isLocalNetwork) {
      return callback(null, true);
    }
    
    console.warn(`🚫 CORS blocked request from: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

app.use('/api', routes);

// Legacy compatibility (some frontend may hit root endpoints)
app.use('/', routes);


// Middleware global para garantir CORS em todos os erros
app.use((err, req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  console.error(err.stack);
  // Se já foi enviada resposta, não tente enviar novamente
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  
  // Load and start scheduled backups
  scheduledBackupService.loadBackupConfig().then(() => {
    console.log('Scheduled backup service initialized');
  }).catch(err => {
    console.error('Failed to initialize scheduled backups:', err);
  });
});
