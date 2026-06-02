import { httpServer } from './app.js';
import { db } from './db/index.js';
import './utils/bootstrap.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // simple DB health check
    await db.execute('SELECT 1');

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 SmartHR API running on port ${PORT}`);
      console.log('── 📡 WebSocket server active');
      console.log('── 🗄️  Database: Connected');
      console.log(`── 🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

startServer();