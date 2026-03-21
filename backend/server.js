const app = require('./src/app');
const { pool } = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection verified');

    app.listen(PORT, () => {
      console.log(`🚀 PLM Server running at http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
