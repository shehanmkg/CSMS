require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const { logger } = require('./utils/logger');
const { WebSocketServer } = require('./websocket/server');
const { errorHandler } = require('./middleware/errorHandler');
const stationService = require('./services/stationService');

// Constants
const PORT = process.env.PORT || 9220;

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

app.get('/api/stations/:id', (req, res) => {
  try {
    const station = stationService.getChargePoint(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    res.json(station);
  } catch (error) {
    logger.error('Error getting station', { 
      error: error.message,
      stationId: req.params.id
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Error handling
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server using the HTTP server
// This allows both HTTP and WebSocket on the same port
const wsServer = new WebSocketServer(server);

// Start HTTP server
server.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`API available at http://localhost:${PORT}/api`);
  logger.info(`WebSocket server available at ws://localhost:${PORT}`);
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle server shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app; 