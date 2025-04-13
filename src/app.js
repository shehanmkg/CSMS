// CSMS Backend - Main application entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { logger } = require('./utils/logger');
const WebSocketServer = require('./websocket/server');
const http = require('http');
const stationService = require('./services/stationService');
const transactionService = require('./services/transactionService');
const { WebSocketServer: WS } = require('ws');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static dashboard files
app.use(express.static(path.join(__dirname, 'public')));

// Root HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
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

// Get a specific station
app.get('/api/stations/:stationId', (req, res) => {
  try {
    const { stationId } = req.params;
    const station = stationService.getChargePoint(stationId);
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    res.json({ 
      station: {
        id: stationId,
        ...station
      }
    });
  } catch (error) {
    logger.error('Error getting station', { 
      error: error.message, 
      stationId: req.params.stationId 
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Payment API endpoint - receives payment confirmation
app.post('/api/payment/complete', (req, res) => {
  const { paymentId } = req.body;
  
  if (!paymentId) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing payment ID'
    });
  }
  
  // In a real implementation, you would validate the payment with a payment provider
  // For this demo, we'll simulate a successful payment
  
  // Extract stationId and connectorId from the paymentId 
  // Format: payment_stationId_connectorId_timestamp
  const [prefix, stationId, connectorId, timestamp] = paymentId.split('_');
  
  if (!stationId || !connectorId) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid payment ID format'
    });
  }
  
  logger.info('Processing payment', { 
    paymentId, 
    stationId, 
    connectorId 
  });
  
  // Generate a random RFID tag ID for this transaction
  const idTag = `Payment_${paymentId}`;
  
  // Get the WebSocketServer instance
  const wsServer = WebSocketServer.getInstance();
  
  // Start the transaction remotely
  wsServer.remoteStartTransaction(stationId, connectorId, idTag, (responsePayload) => {
    logger.info('Remote start transaction response', responsePayload);
    
    // Broadcast payment success to frontend clients
    if (global.broadcastToFrontend && responsePayload.status === 'Accepted') {
      global.broadcastToFrontend('payment_update', {
        chargePointId: stationId,
        connectorId,
        paymentId,
        transactionId: idTag,
        status: 'completed',
        timestamp: new Date().toISOString()
      });
    }
    
    if (responsePayload.status === 'Accepted') {
      res.json({
        status: 'success',
        message: 'Payment processed and charging started',
        transactionId: responsePayload.transactionId
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: `Failed to start charging: ${responsePayload.status}`
      });
    }
  });
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

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket servers in noServer mode
const frontendWss = new WS({ noServer: true });

// Initialize the OCPP WebSocketServer instance
const ocppServer = WebSocketServer.getInstance();
ocppServer.initialize(server);

// Handle all upgrade events
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  
  if (pathname === '/ws') {
    // Frontend WebSocket connections
    logger.info(`Frontend WebSocket connection request received at ${pathname}`);
    frontendWss.handleUpgrade(request, socket, head, (ws) => {
      frontendWss.emit('connection', ws, request);
    });
  } else {
    // OCPP connections are passed to the OCPP server
    logger.info(`OCPP WebSocket connection request received at ${pathname}`);
    ocppServer.handleUpgrade(request, socket, head);
  }
});

// Handle frontend client connections
frontendWss.on('connection', (client, request) => {
  const id = Math.random().toString(36).substring(2, 10);
  client.id = id;
  client.subscriptions = new Set();
  
  logger.info(`Frontend client connected: ${id}`);
  
  // Send welcome message
  client.send(JSON.stringify({ 
    type: 'welcome', 
    message: 'Connected to CSMS WebSocket server',
    clientId: id
  }));
  
  // Handle incoming message from frontend client
  client.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      
      // Handle subscription requests
      if (parsedMessage.type === 'subscribe' && parsedMessage.stationId) {
        const stationId = parsedMessage.stationId;
        logger.info(`Client ${id} subscribed to station: ${stationId}`);
        
        // Add the stationId to the client's subscriptions
        client.subscriptions.add(stationId);
      }
      
      // Handle unsubscribe requests
      if (parsedMessage.type === 'unsubscribe' && parsedMessage.stationId) {
        const stationId = parsedMessage.stationId;
        logger.info(`Client ${id} unsubscribed from station: ${stationId}`);
        
        // Remove the stationId from the client's subscriptions
        client.subscriptions.delete(stationId);
      }
      
      // Handle other message types as needed
      logger.debug(`Received message from client ${id}:`, parsedMessage);
    } catch (error) {
      logger.error(`Error processing message from client ${id}:`, error);
    }
  });
  
  // Handle client disconnect
  client.on('close', () => {
    logger.info(`Frontend client disconnected: ${id}`);
  });
});

// Helper function to broadcast messages to frontend clients
global.broadcastToFrontend = (type, data) => {
  if (!frontendWss) return;
  
  const messageStr = JSON.stringify({ 
    type, 
    data,
    timestamp: new Date().toISOString()
  });
  
  frontendWss.clients.forEach(client => {
    // Only send to clients who are subscribed to this station, or no specific station
    if (client.readyState === client.OPEN) {
      // If the data has a chargePointId, check subscriptions
      if (data.chargePointId) {
        // Send if client is subscribed to this station or has no subscriptions (subscribes to all)
        if (client.subscriptions.size === 0 || client.subscriptions.has(data.chargePointId)) {
          client.send(messageStr);
        }
      } else {
        // If no chargePointId in the data, send to all connected clients
        client.send(messageStr);
      }
    }
  });
};

// Start the server
server.listen(PORT, () => {
  logger.info(`CSMS server running on port ${PORT}`);
  logger.info(`Dashboard available at http://localhost:${PORT}/`);
});

module.exports = app; 