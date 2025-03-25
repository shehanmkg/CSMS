const WebSocket = require('ws');
const url = require('url');
const { logger } = require('../utils/logger');
const { processOcppMessage } = require('../ocpp/messageHandler');

// Singleton instance
let instance = null;

class WebSocketServer {
    /**
     * Create a WebSocket server for OCPP communication
     * 
     * @param {number|http.Server} serverOrPort - HTTP server instance or port number
     */
    constructor(serverOrPort = 9220) {
        // If singleton exists, return it
        if (instance) {
            return instance;
        }
        
        instance = this;
        
        this.connections = new Map();
        this.pendingRequests = new Map();
        
        if (typeof serverOrPort === 'number') {
            // Standalone mode - create WebSocket server on a specific port
            this.port = serverOrPort;
            this.standalone = true;
        } else {
            // Attached mode - use existing HTTP server
            this.server = serverOrPort;
            this.standalone = false;
        }
        
        this.setupServer();
    }

    /**
     * Get the singleton instance
     * @returns {WebSocketServer} The singleton instance
     */
    static getInstance() {
        if (!instance) {
            return new WebSocketServer();
        }
        return instance;
    }

    setupServer() {
        // Configure WebSocket server options
        const wsOptions = {
            handleProtocols: (protocols) => {
                logger.debug('Protocol negotiation', { protocols });
                
                // Just accept the first protocol
                if (protocols && protocols.length > 0) {
                    return protocols[0];
                }
                return true;
            }
        };
        
        // Create WebSocket server based on mode
        if (this.standalone) {
            wsOptions.port = this.port;
            this.wss = new WebSocket.Server(wsOptions);
            logger.info(`Standalone WebSocket server started on port ${this.port}`);
        } else {
            wsOptions.server = this.server;
            this.wss = new WebSocket.Server(wsOptions);
            logger.info('WebSocket server attached to existing HTTP server');
        }

        this.wss.on('connection', this.handleConnection.bind(this));
    }

    handleConnection(ws, req) {
        try {
            // Extract chargePointId from URL path
            const parsedUrl = url.parse(req.url);
            const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
            
            if (pathSegments.length === 0) {
                logger.warn('Connection rejected - No chargePointId in URL');
                ws.close(1003, 'Charge Point ID is required');
                return;
            }
            
            const chargePointId = pathSegments[pathSegments.length - 1];
            logger.info(`Client ${chargePointId} connected from ${req.socket.remoteAddress}`);

            // Store connection and chargePointId on the socket
            ws.chargePointId = chargePointId;
            this.connections.set(chargePointId, ws);

            // Setup ping interval
            ws.isAlive = true;
            const pingInterval = setInterval(() => {
                if (!ws.isAlive) {
                    logger.warn(`Client ${chargePointId} is not responding, terminating connection`);
                    clearInterval(pingInterval);
                    ws.terminate();
                    return;
                }
                ws.isAlive = false;
                ws.ping();
            }, 30000);

            // Handle pong responses
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            // Handle incoming messages
            ws.on('message', (message) => {
                try {
                    const parsedMessage = JSON.parse(message.toString());
                    
                    // Check for CallResult (response to our requests)
                    if (parsedMessage[0] === 3) { // CALLRESULT
                        const messageId = parsedMessage[1];
                        const payload = parsedMessage[2];
                        
                        // Handle pending request callbacks
                        this.handleCallResult(messageId, payload);
                    }
                    
                    // Process all OCPP messages normally
                    processOcppMessage(ws, message.toString());
                } catch (error) {
                    logger.error(`Error handling message from ${chargePointId}:`, error);
                }
            });

            // Handle connection close
            ws.on('close', () => {
                logger.info(`Client ${chargePointId} disconnected`);
                clearInterval(pingInterval);
                this.connections.delete(chargePointId);
            });

            // Handle errors
            ws.on('error', (error) => {
                logger.error(`WebSocket error for ${chargePointId}:`, error);
            });
        } catch (error) {
            logger.error('Error in connection handler:', error);
            ws.close(1011, 'Internal server error');
        }
    }

    /**
     * Handle OCPP CallResult responses
     * @param {string} messageId - The message ID of the original request
     * @param {object} payload - The response payload
     */
    handleCallResult(messageId, payload) {
        const pendingRequest = this.pendingRequests.get(messageId);
        if (pendingRequest) {
            logger.debug(`Received response for request ${messageId}`, {
                action: pendingRequest.action,
                response: payload
            });
            
            // Call the callback with the payload
            if (pendingRequest.callback) {
                pendingRequest.callback(payload);
            }
            
            // Remove from pending requests
            this.pendingRequests.delete(messageId);
        }
    }

    /**
     * Send an OCPP request to a charge point
     * @param {string} chargePointId - The charge point ID
     * @param {string} action - The OCPP action
     * @param {object} payload - The request payload
     * @param {function} callback - Callback function for the response
     * @returns {boolean} Success status
     */
    sendRequest(chargePointId, action, payload, callback) {
        const ws = this.connections.get(chargePointId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            logger.error(`Cannot send request - charge point ${chargePointId} not connected`);
            return false;
        }
        
        // Generate message ID
        const messageId = Date.now().toString();
        
        // Create OCPP CALL message [2, messageId, action, payload]
        const message = [2, messageId, action, payload];
        
        try {
            // Store callback for handling response
            this.pendingRequests.set(messageId, {
                action,
                timestamp: Date.now(),
                callback
            });
            
            // Send the message
            ws.send(JSON.stringify(message));
            
            logger.info(`Sent ${action} request to ${chargePointId}`, {
                messageId,
                payload
            });
            
            return true;
        } catch (error) {
            logger.error(`Error sending ${action} to ${chargePointId}`, {
                error: error.message
            });
            this.pendingRequests.delete(messageId);
            return false;
        }
    }

    /**
     * Send a RemoteStartTransaction request to a charge point
     * @param {string} chargePointId - The charge point ID
     * @param {number} connectorId - The connector ID
     * @param {string} idTag - The ID tag for authorization
     * @param {function} callback - Callback function for the response
     * @returns {boolean} Success status
     */
    startRemoteTransaction(chargePointId, connectorId, idTag, callback) {
        const payload = {
            connectorId: parseInt(connectorId, 10),
            idTag
        };
        
        return this.sendRequest(chargePointId, 'RemoteStartTransaction', payload, callback);
    }

    /**
     * Get a list of all connected charge points
     * @returns {Array} Array of charge point IDs
     */
    getConnectedChargePoints() {
        return Array.from(this.connections.keys());
    }

    /**
     * Get a WebSocket connection for a specific charge point
     * @param {string} chargePointId 
     * @returns {WebSocket|undefined}
     */
    getConnection(chargePointId) {
        return this.connections.get(chargePointId);
    }
}

// Export the WebSocketServer class
module.exports = WebSocketServer; 