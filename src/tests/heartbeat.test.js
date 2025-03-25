/**
 * Heartbeat Operation Tests
 * Tests the OCPP Heartbeat message handler
 */

const handleHeartbeat = require('../ocpp/handlers/heartbeat');
const { ACTIONS } = require('../ocpp/schemas');

// Mock the logger to prevent console output during tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Heartbeat Handler Tests', () => {
  // Store the original Date implementation
  const originalDate = global.Date;
  
  // Setup fixed date for testing
  beforeEach(() => {
    // Mock Date to return a fixed timestamp for consistent testing
    const fixedDate = new Date('2023-01-01T12:00:00.000Z');
    global.Date = jest.fn(() => fixedDate);
    global.Date.toISOString = jest.fn(() => fixedDate.toISOString());
    global.Date.now = jest.fn(() => fixedDate.getTime());
  });
  
  // Restore original Date after tests
  afterEach(() => {
    global.Date = originalDate;
  });
  
  test('should handle valid Heartbeat request', async () => {
    // Test with empty payload (valid for Heartbeat)
    const chargePointId = 'CP001';
    const emptyPayload = {};
    
    const response = await handleHeartbeat(emptyPayload, chargePointId);
    
    // Verify response structure
    expect(response).toBeDefined();
    expect(response.currentTime).toBeDefined();
    expect(response.currentTime).toBe('2023-01-01T12:00:00.000Z');
  });
  
  test('should reject Heartbeat with invalid payload', async () => {
    // Test with invalid payload (Heartbeat should have empty payload)
    const chargePointId = 'CP001';
    const invalidPayload = { extraField: 'invalid' };
    
    // Expect the handler to throw an error for invalid payload
    await expect(handleHeartbeat(invalidPayload, chargePointId))
      .rejects.toThrow('Unknown property: extraField');
  });
  
  test('should include ISO 8601 formatted timestamp', async () => {
    const chargePointId = 'CP001';
    const response = await handleHeartbeat({}, chargePointId);
    
    // Verify timestamp format (ISO 8601)
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    expect(response.currentTime).toMatch(iso8601Regex);
  });
}); 