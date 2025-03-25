require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { logger } = require('./utils/logger');
const { WebSocketServer } = require('./websocket/server');
const { errorHandler } = require('./middleware/errorHandler');

// Initialize Express app for HTTP API
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Create WebSocket server instance on port 9220
const wsServer = new WebSocketServer(9220);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

// Start HTTP server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`HTTP server listening on port ${PORT}`);
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app; 