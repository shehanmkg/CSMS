// Simple WebSocket server for testing MicroOCPP simulator connection
const WebSocket = require('ws');

// Create a WebSocket server on port 9220
const wss = new WebSocket.Server({ 
  port: 9220,
  handleProtocols: (protocols) => {
    console.log('Client requested protocols:', protocols);
    // Accept ocpp1.6 protocol
    if (protocols.includes('ocpp1.6')) {
      return 'ocpp1.6';
    }
    return false;
  }
});

// Handle new connections
wss.on('connection', (ws, req) => {
  console.log('New connection from:', req.socket.remoteAddress);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  
  // Extract chargeBoxId from URL
  const chargeBoxId = req.url.split('/').filter(Boolean)[0];
  console.log('ChargeBoxId:', chargeBoxId);
  
  // Mark connection as alive for ping-pong
  ws.isAlive = true;
  
  // Handle pong messages
  ws.on('pong', () => {
    ws.isAlive = true;
    console.log('Received pong from', chargeBoxId);
  });
  
  // Handle incoming messages
  ws.on('message', (message) => {
    console.log('Received message from', chargeBoxId, ':', message.toString());
    
    try {
      const parsedMessage = JSON.parse(message);
      
      // If it's a BootNotification call (type 2)
      if (parsedMessage[0] === 2 && parsedMessage[2] === 'BootNotification') {
        console.log('Received BootNotification from', chargeBoxId);
        
        // Send a BootNotification response
        const response = [
          3, // CallResult
          parsedMessage[1], // Same messageId
          {
            status: "Accepted",
            currentTime: new Date().toISOString(),
            interval: 300
          }
        ];
        
        ws.send(JSON.stringify(response));
        console.log('Sent BootNotification response to', chargeBoxId);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    console.log('Connection closed for', chargeBoxId);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Set up ping interval to keep connections alive
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 5000);

// Clean up interval on server close
wss.on('close', () => {
  clearInterval(interval);
});

console.log('WebSocket server listening on port 9220'); 