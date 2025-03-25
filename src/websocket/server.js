const WebSocket = require('ws');
const { logger } = require('../utils/logger');
const url = require('url');

const PING_INTERVAL = 5000; // 5 seconds, matching client default
const STALE_TIMEOUT = 300000; // 5 minutes, matching client default

class WebSocketServer {
    constructor(port = 9220) {
        this.port = port;
        this.connections = new Map();
        this.setupServer();
    }

    setupServer() {
        this.wss = new WebSocket.Server({
            port: this.port,
            verifyClient: this.verifyClient.bind(this),
            handleProtocols: this.handleProtocols.bind(this)
        });

        this.wss.on('connection', this.handleConnection.bind(this));
        logger.info(`WebSocket server started on port ${this.port}`);
    }

    verifyClient(info, callback) {
        const { url: requestUrl, headers } = info.req;
        logger.info(`New connection attempt from ${info.req.socket.remoteAddress} to ${requestUrl}`);

        try {
            // Parse URL to get chargePointId
            const parsedUrl = url.parse(requestUrl);
            const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
            
            // Make URL validation more permissive
            const chargeBoxId = pathSegments.length > 0 ? pathSegments[0] : null;
            if (!chargeBoxId) {
                logger.error('No chargeBoxId provided in URL');
                return callback(false, 400, 'No chargeBoxId provided');
            }

            // Verify protocol - be more permissive
            const protocols = headers['sec-websocket-protocol'];
            if (!protocols) {
                logger.warn('No protocol specified, accepting connection anyway');
                info.req.chargeBoxId = chargeBoxId;
                return callback(true);
            }

            // Check for ocpp1.6 protocol
            const validProtocolPattern = /ocpp1\.6/i;
            const hasValidProtocol = protocols.split(',').some(p => validProtocolPattern.test(p.trim()));
            if (!hasValidProtocol) {
                logger.warn(`Non-standard protocol requested: ${protocols}, accepting anyway`);
            }

            // Store chargeBoxId for use in handleConnection
            info.req.chargeBoxId = chargeBoxId;

            // Log successful validation
            logger.info(`Connection validated for chargeBoxId: ${chargeBoxId}`);
            callback(true);
        } catch (error) {
            logger.error('Error in verifyClient:', error);
            callback(false, 500, 'Internal server error');
        }
    }

    handleProtocols(protocols) {
        // Make sure protocols is an array
        const protocolArray = Array.isArray(protocols) ? protocols : [protocols];
        
        // Find and accept any ocpp1.6 protocol variant
        for (const protocol of protocolArray) {
            if (/ocpp1\.6/i.test(protocol)) {
                logger.info(`Accepting protocol: ${protocol}`);
                return protocol;
            }
        }
        
        // If no valid protocol, accept the first one
        if (protocolArray.length > 0) {
            logger.warn(`No valid OCPP protocol found, accepting: ${protocolArray[0]}`);
            return protocolArray[0];
        }
        return false;
    }

    handleConnection(ws, req) {
        const chargeBoxId = req.chargeBoxId;
        logger.info(`Client ${chargeBoxId} connected from ${req.socket.remoteAddress}`);

        // Store connection
        this.connections.set(chargeBoxId, ws);

        // Setup ping interval
        ws.isAlive = true;
        ws.pingInterval = setInterval(() => {
            if (!ws.isAlive) {
                logger.warn(`Client ${chargeBoxId} is not responding, terminating connection`);
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        }, PING_INTERVAL);

        // Handle pong responses
        ws.on('pong', () => {
            ws.isAlive = true;
            logger.debug(`Received pong from ${chargeBoxId}`);
        });

        // Handle incoming messages
        ws.on('message', (message) => {
            try {
                const msgStr = message.toString();
                logger.info(`Received message from ${chargeBoxId}: ${msgStr}`);
                
                // Parse and validate OCPP message
                let parsedMessage;
                try {
                    parsedMessage = JSON.parse(msgStr);
                } catch (e) {
                    logger.warn(`Failed to parse message as JSON: ${msgStr}`);
                    return;
                }
                
                if (!Array.isArray(parsedMessage) || parsedMessage.length < 3) {
                    logger.warn(`Invalid message format: ${msgStr}`);
                    return;
                }
                
                const [messageType, messageId, action, payload] = parsedMessage;
                
                // Handle message based on type
                switch(messageType) {
                    case 2: // Call
                        this.handleCall(ws, messageId, action, payload, chargeBoxId);
                        break;
                    case 3: // CallResult
                        this.handleCallResult(ws, messageId, payload, chargeBoxId);
                        break;
                    case 4: // CallError
                        this.handleCallError(ws, messageId, payload, chargeBoxId);
                        break;
                    default:
                        logger.error(`Unknown message type ${messageType} from ${chargeBoxId}`);
                }
            } catch (error) {
                logger.error(`Error handling message from ${chargeBoxId}:`, error);
            }
        });

        // Handle connection close
        ws.on('close', () => {
            logger.info(`Client ${chargeBoxId} disconnected`);
            clearInterval(ws.pingInterval);
            this.connections.delete(chargeBoxId);
        });

        // Handle errors
        ws.on('error', (error) => {
            logger.error(`WebSocket error for ${chargeBoxId}:`, error);
        });
    }

    handleCall(ws, messageId, action, payload, chargeBoxId) {
        logger.info(`Received Call from ${chargeBoxId}: ${action}`);
        // Basic OCPP message handling
        let response = {};
        
        // Handle BootNotification specially
        if (action === 'BootNotification') {
            response = {
                status: "Accepted",
                currentTime: new Date().toISOString(),
                interval: 300
            };
            logger.info(`BootNotification from ${chargeBoxId} accepted`);
        }
        
        ws.send(JSON.stringify([3, messageId, response]));
    }

    handleCallResult(ws, messageId, payload, chargeBoxId) {
        logger.info(`Received CallResult from ${chargeBoxId} for message ${messageId}`);
        // TODO: Implement response handling
    }

    handleCallError(ws, messageId, payload, chargeBoxId) {
        logger.error(`Received CallError from ${chargeBoxId} for message ${messageId}:`, payload);
        // TODO: Implement error handling
    }
}

module.exports = { WebSocketServer }; 