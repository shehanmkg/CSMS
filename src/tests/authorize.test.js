const handleAuthorize = require('../ocpp/handlers/authorize');

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Authorize Handler', () => {
  const chargePointId = 'CP001';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should accept a valid authorization request', async () => {
    const payload = {
      idTag: 'valid123'
    };
    
    const result = await handleAuthorize(payload, chargePointId);
    
    // Check response structure
    expect(result).toHaveProperty('idTagInfo');
    expect(result.idTagInfo).toHaveProperty('status');
    expect(result.idTagInfo.status).toBe('Accepted');
    
    // Should have an expiry date
    expect(result.idTagInfo).toHaveProperty('expiryDate');
    expect(new Date(result.idTagInfo.expiryDate)).toBeInstanceOf(Date);
  });
  
  it('should handle an expired authorization', async () => {
    const payload = {
      idTag: 'expired456'
    };
    
    const result = await handleAuthorize(payload, chargePointId);
    
    expect(result.idTagInfo.status).toBe('Expired');
    expect(result.idTagInfo).toHaveProperty('expiryDate');
  });
  
  it('should handle a blocked authorization', async () => {
    const payload = {
      idTag: 'blocked789'
    };
    
    const result = await handleAuthorize(payload, chargePointId);
    
    expect(result.idTagInfo.status).toBe('Blocked');
  });
  
  it('should throw an error if idTag is missing', async () => {
    const payload = {}; // Missing idTag
    
    await expect(handleAuthorize(payload, chargePointId))
      .rejects
      .toThrow('Missing required field: idTag');
  });
  
  it('should accept unknown tags in development mode', async () => {
    // Save the original NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV;
    
    // Set to development
    process.env.NODE_ENV = 'development';
    
    const payload = {
      idTag: 'unknown-tag-123'
    };
    
    const result = await handleAuthorize(payload, chargePointId);
    
    expect(result.idTagInfo.status).toBe('Accepted');
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  it('should reject unknown tags in production mode', async () => {
    // Save the original NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV;
    
    // Set to production
    process.env.NODE_ENV = 'production';
    
    const payload = {
      idTag: 'unknown-tag-456'
    };
    
    const result = await handleAuthorize(payload, chargePointId);
    
    expect(result.idTagInfo.status).toBe('Invalid');
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });
}); 