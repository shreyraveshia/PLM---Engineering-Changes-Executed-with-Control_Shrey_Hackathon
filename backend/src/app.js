const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',     require('./routes/auth.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/boms',     require('./routes/boms.routes'));
app.use('/api/ecos',     require('./routes/ecos.routes'));
app.use('/api/stages',   require('./routes/stages.routes'));
app.use('/api/reports',  require('./routes/reports.routes'));
app.use('/api/audit',    require('./routes/audit.routes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'PLM Backend' });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
