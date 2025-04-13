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

        // Store the server or port, but don't directly use it for attaching
        // We'll handle the upgrade events manually in app.js
        if (typeof serverOrPort === 'number') {
            this.port = serverOrPort;
            this.standalone = true;
        } else {
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
            },
            // Always use noServer mode since we're handling upgrades manually
            noServer: true
        };

        // Create WebSocket server
        this.wss = new WebSocket.Server(wsOptions);
        logger.info('WebSocket server created in noServer mode');

        // Only need connection handler here, as we'll be routing the upgrades manually
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
     * Send a RemoteStopTransaction request to a charge point
     * @param {string} chargePointId - The charge point ID
     * @param {number} transactionId - The ID of the transaction to stop
     * @param {function} callback - Callback function for the response (receives payload like { status: 'Accepted' | 'Rejected' })
     * @returns {boolean} Success status of sending the request
     */
    remoteStopTransaction(chargePointId, transactionId, callback) {
        // OCPP 1.6 requires transactionId to be an integer for RemoteStopTransaction
        const transactionIdInt = parseInt(transactionId, 10);
        if (isNaN(transactionIdInt)) {
             logger.error(`Invalid non-numeric transactionId provided for RemoteStopTransaction: ${transactionId}`);
             // Optionally invoke callback with an error status or return false immediately
             if (callback) {
                 callback({ status: 'Rejected', error: 'Invalid transactionId format' });
             }
             return false; // Indicate failure to send due to bad data
        }

        const payload = {
            transactionId: transactionIdInt
        };
        logger.info(`Attempting RemoteStopTransaction for transaction ${transactionIdInt} on ${chargePointId}`);
        return this.sendRequest(chargePointId, 'RemoteStopTransaction', payload, callback);
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

    // Add initialize method
    initialize(server) {
        this.server = server;
        logger.info('WebSocketServer initialized with HTTP server reference');
        return this;
    }

    /**
     * Alias for startRemoteTransaction to maintain backward compatibility
     * @param {string} chargePointId - The charge point ID
     * @param {number} connectorId - The connector ID
     * @param {string} idTag - The ID tag for authorization
     * @param {function} callback - Callback function for the response
     * @returns {boolean} Success status
     */
    remoteStartTransaction(chargePointId, connectorId, idTag, callback) {
        return this.startRemoteTransaction(chargePointId, connectorId, idTag, callback);
    }

    // Add handleUpgrade method for manual handling of upgrade requests
    handleUpgrade(request, socket, head) {
        try {
            // Extract chargePointId from URL path
            const parsedUrl = url.parse(request.url);
            const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

            if (pathSegments.length === 0) {
                logger.warn('Connection rejected - No chargePointId in URL');
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            // Process the upgrade with the WS instance
            this.wss.handleUpgrade(request, socket, head, (ws) => {
                this.wss.emit('connection', ws, request);
            });
        } catch (error) {
            logger.error('Error handling WebSocket upgrade:', error);
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        }
    }
}

// Export the WebSocketServer class
module.exports = WebSocketServer;