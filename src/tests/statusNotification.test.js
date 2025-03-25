/**
 * StatusNotification Operation Tests
 * Tests the OCPP StatusNotification message handler
 */

const { handleStatusNotification } = require('../ocpp/handlers/statusNotification');
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

describe('StatusNotification Handler Tests', () => {
  // Valid StatusNotification payload with "Available" status
  const validAvailablePayload = {
    connectorId: 1,
    errorCode: 'NoError',
    status: 'Available',
    timestamp: '2023-01-01T12:00:00.000Z'
  };
  
  // Valid StatusNotification payload with "Faulted" status
  const validFaultedPayload = {
    connectorId: 2,
    errorCode: 'HighTemperature',
    status: 'Faulted',
    info: 'Temperature limit exceeded',
    timestamp: '2023-01-01T12:05:00.000Z',
    vendorId: 'VendorX',
    vendorErrorCode: 'TEMP-001'
  };
  
  // Invalid StatusNotification payload missing required fields
  const invalidPayload = {
    connectorId: 3,
    // Missing errorCode and status
    timestamp: '2023-01-01T12:10:00.000Z'
  };
  
  // Invalid StatusNotification payload with invalid enum value
  const invalidEnumPayload = {
    connectorId: 4,
    errorCode: 'NoError',
    status: 'InvalidStatus', // Not a valid status enum value
    timestamp: '2023-01-01T12:15:00.000Z'
  };
  
  test('should handle valid Available status notification', async () => {
    const chargePointId = 'CP001';
    
    // Call the handler with valid Available payload
    const response = await handleStatusNotification(validAvailablePayload, chargePointId);
    
    // Verify response is an empty object as per OCPP 1.6J spec
    expect(response).toEqual({});
  });
  
  test('should handle valid Faulted status notification', async () => {
    const chargePointId = 'CP001';
    
    // Call the handler with valid Faulted payload
    const response = await handleStatusNotification(validFaultedPayload, chargePointId);
    
    // Verify response is an empty object as per OCPP 1.6J spec
    expect(response).toEqual({});
  });
  
  test('should reject payload missing required fields', async () => {
    const chargePointId = 'CP001';
    
    // Expect the handler to throw an error for invalid payload
    await expect(handleStatusNotification(invalidPayload, chargePointId))
      .rejects.toThrow('Missing required property');
  });
  
  test('should reject payload with invalid enum value', async () => {
    const chargePointId = 'CP001';
    
    // Expect the handler to throw an error for invalid enum value
    await expect(handleStatusNotification(invalidEnumPayload, chargePointId))
      .rejects.toThrow('Property status must be one of');
  });
}); 