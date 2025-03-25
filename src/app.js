require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { logger } = require('./utils/logger');
const { WebSocketServer } = require('./websocket/server');
const { errorHandler } = require('./middleware/errorHandler');
const stationService = require('./services/stationService');
const transactionService = require('./services/transactionService');

// Constants
const PORT = process.env.PORT || 9220;

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
// Stations API
app.get('/api/stations', (req, res) => {
  try {
    const stations = stationService.getAllChargePoints();
    res.json({ 
      count: stations.length,
      stations 
    });
  } catch (error) {
    logger.error('Error getting stations', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Transactions API
app.get('/api/transactions', (req, res) => {
  try {
    const transactions = transactionService.getAllTransactions();
    res.json({
      count: transactions.length,
      transactions
    });
  } catch (error) {
    logger.error('Error getting transactions', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get transactions for a specific charge point
app.get('/api/stations/:chargePointId/transactions', (req, res) => {
  try {
    const { chargePointId } = req.params;
    const transactions = transactionService.getTransactionsByChargePoint(chargePointId);
    res.json({
      chargePointId,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    logger.error('Error getting station transactions', { 
      error: error.message, 
      chargePointId: req.params.chargePointId 
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Serve the dashboard SPA
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Default route - redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Error handling
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Start the WebSocket server for OCPP
const wss = new WebSocketServer(server);

// Start the server
server.listen(PORT, () => {
  logger.info(`CSMS Server running on port ${PORT}`);
  logger.info(`Dashboard available at http://localhost:${PORT}/dashboard`);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Graceful shutdown
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app; 