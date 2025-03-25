/**
 * Simulator Integration Tests
 * Tests interaction with MicroOCPP simulator
 * Note: These tests don't automatically run the simulator, but provide
 * a framework for manual testing with the simulator
 */

const WebSocket = require('ws');
const { MESSAGE_TYPE, ACTIONS } = require('../ocpp/schemas');

/**
 * Utility function to create a test WebSocket client that simulates the OCPP client
 * @param {string} chargePointId 
 * @returns {Promise<WebSocket>}
 */
function createTestClient(chargePointId) {
  return new Promise((resolve, reject) => {
    // Use the same connection pattern as documented for the simulator
    const host = '192.168.4.43'; // Replace with actual host IP
    const port = 9220;
    const ws = new WebSocket(`ws://${host}:${port}/${chargePointId}`, ['ocpp1.6']);
    
    ws.on('open', () => {
      console.log(`Test client connected as ${chargePointId}`);
      resolve(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
      reject(error);
    });
    
    // Add timeout
    setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 5000);
  });
}

/**
 * Send a heartbeat message and await the response
 * @param {WebSocket} ws 
 * @param {string} messageId 
 * @returns {Promise<object>}
 */
function sendHeartbeat(ws, messageId) {
  return new Promise((resolve, reject) => {
    // Create heartbeat message
    const heartbeatMsg = [MESSAGE_TYPE.CALL, messageId, ACTIONS.HEARTBEAT, {}];
    
    // Setup response handler
    const responseHandler = (data) => {
      try {
        const response = JSON.parse(data);
        
        // Check if this is the response to our message
        if (response[0] === MESSAGE_TYPE.CALLRESULT && response[1] === messageId) {
          ws.removeEventListener('message', responseHandler);
          resolve(response[2]); // Return the payload
        }
        
        // Check if this is an error for our message
        if (response[0] === MESSAGE_TYPE.CALLERROR && response[1] === messageId) {
          ws.removeEventListener('message', responseHandler);
          reject(new Error(`Error response: ${response[3]}`));
        }
      } catch (error) {
        console.error('Error parsing response:', error);
      }
    };
    
    // Listen for the response
    ws.addEventListener('message', responseHandler);
    
    // Send the heartbeat
    ws.send(JSON.stringify(heartbeatMsg));
    
    // Add timeout
    setTimeout(() => {
      ws.removeEventListener('message', responseHandler);
      reject(new Error('Response timeout'));
    }, 5000);
  });
}

/**
 * These tests are designed to be run manually with the simulator
 * Uncomment and modify as needed for testing with the actual simulator
 */
describe.skip('Simulator Integration Tests', () => {
  // For manual simulator testing
  
  /*
  let client;
  
  beforeAll(async () => {
    // Connect to the CSMS server
    client = await createTestClient('TEST001');
  });
  
  afterAll(() => {
    // Close the connection
    if (client) {
      client.close();
    }
  });
  
  test('should receive valid Heartbeat response', async () => {
    // Send heartbeat and get response
    const response = await sendHeartbeat(client, 'HB-TEST-1');
    
    // Verify response format
    expect(response).toHaveProperty('currentTime');
    
    // Verify timestamp format (ISO 8601)
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    expect(response.currentTime).toMatch(iso8601Regex);
    
    console.log('Received valid heartbeat response:', response);
  });
  */
});

/**
 * Manual test instructions (not executed automatically)
 */
describe('Manual Simulator Test Steps', () => {
  test.skip('Heartbeat test procedure', () => {
    /* 
    1. Start the CSMS server using:
       npm run dev
       
    2. Configure the MicroOCPP simulator with:
       - Backend URL: ws://192.168.4.43:9220/CP001 (use your actual IP)
       - Chargebox ID: CP001
       - Protocol: ocpp1.6
       - Ping Interval: 5
       
    3. Connect the simulator to the CSMS server
    
    4. Verify in the CSMS logs that the connection is established
    
    5. Manually trigger a Heartbeat message from the simulator
    
    6. Verify in the CSMS logs that:
       - The Heartbeat message is received
       - A proper response with currentTime is sent
       - The connection remains open
       
    7. Monitor for any errors in both the simulator and CSMS logs
    */
  });
}); 