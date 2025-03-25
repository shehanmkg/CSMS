const WebSocket = require('ws');
const url = require('url');
const { logger } = require('../utils/logger');
const { processOcppMessage } = require('../ocpp/messageHandler');

class WebSocketServer {
    /**
     * Create a WebSocket server for OCPP communication
     * 
     * @param {number|http.Server} serverOrPort - HTTP server instance or port number
     */
    constructor(serverOrPort = 9220) {
        this.connections = new Map();
        
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
    getConnectionByChargePointId(chargePointId) {
        return this.connections.get(chargePointId);
    }
}

module.exports = { WebSocketServer }; 