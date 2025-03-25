const authService = require('../services/authService');

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Auth Service', () => {
  const testChargePointId = 'CP001';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Token validation', () => {
    it('should validate known tokens correctly', () => {
      // Valid token
      let result = authService.validateToken('valid123');
      expect(result.status).toBe('Accepted');
      expect(result).toHaveProperty('expiryDate');
      
      // Expired token
      result = authService.validateToken('expired456');
      expect(result.status).toBe('Expired');
      
      // Blocked token
      result = authService.validateToken('blocked789');
      expect(result.status).toBe('Blocked');
    });
    
    it('should handle parent-child token relationships', () => {
      const result = authService.validateToken('child111');
      expect(result.status).toBe('Accepted');
      expect(result.parentIdTag).toBe('parent999');
    });
    
    it('should accept TEST token', () => {
      const result = authService.validateToken('TEST');
      expect(result.status).toBe('Accepted');
      expect(result).toHaveProperty('expiryDate');
    });
    
    it('should return Invalid status for null or empty idTag', () => {
      const result = authService.validateToken(null);
      expect(result.status).toBe('Invalid');
    });
  });
  
  describe('Token registration', () => {
    it('should register new tokens', () => {
      const success = authService.registerToken('new-token-123');
      expect(success).toBe(true);
      
      // Verify it was registered
      const authStatus = authService.validateToken('new-token-123');
      expect(authStatus.status).toBe('Accepted');
    });
    
    it('should register tokens with specific status', () => {
      authService.registerToken('blocked-token', 'Blocked');
      const authStatus = authService.validateToken('blocked-token');
      expect(authStatus.status).toBe('Blocked');
    });
    
    it('should handle parent-child relationships', () => {
      authService.registerToken('parent-token', 'Accepted');
      authService.registerToken('child-token', 'Accepted', 'parent-token');
      
      const authStatus = authService.validateToken('child-token');
      expect(authStatus.parentIdTag).toBe('parent-token');
    });
  });
  
  describe('Authorization sessions', () => {
    it('should start and verify authorization sessions', () => {
      // Start authorization with valid token
      authService.startAuthorization('valid123', testChargePointId);
      
      // Check if authorized
      const isAuth = authService.isAuthorized('valid123', testChargePointId);
      expect(isAuth).toBe(true);
    });
    
    it('should not authorize invalid tokens', () => {
      // Try to authorize with blocked token
      authService.startAuthorization('blocked789', testChargePointId);
      
      // Should not be authorized
      const isAuth = authService.isAuthorized('blocked789', testChargePointId);
      expect(isAuth).toBe(false);
    });
    
    it('should end authorization sessions', () => {
      // Start authorization
      authService.startAuthorization('valid123', testChargePointId);
      
      // End it
      const success = authService.endAuthorization('valid123', testChargePointId);
      expect(success).toBe(true);
      
      // Should no longer be authorized
      const isAuth = authService.isAuthorized('valid123', testChargePointId);
      expect(isAuth).toBe(false);
    });
    
    it('should handle ending non-existent authorization', () => {
      const success = authService.endAuthorization('nonexistent', testChargePointId);
      expect(success).toBe(false);
    });
  });
}); 