const { logger } = require('../utils/logger');

// In-memory storage for authorization data and active tokens
const authData = {
  tokens: new Map(),
  activeAuthorizations: new Map()
};

// Test tokens for development
const testTokens = {
  'valid123': { status: 'Accepted', parentId: null },
  'expired456': { status: 'Expired', parentId: null },
  'blocked789': { status: 'Blocked', parentId: null },
  'parent999': { status: 'Accepted', parentId: null },
  'child111': { status: 'Accepted', parentId: 'parent999' }
};

/**
 * Initialize the auth service with test data
 */
function initTestData() {
  Object.entries(testTokens).forEach(([idTag, data]) => {
    authData.tokens.set(idTag, {
      status: data.status,
      parentId: data.parentId,
      expiryDate: data.status === 'Expired' 
        ? new Date(Date.now() - 86400000).toISOString() // Yesterday
        : new Date(Date.now() + 86400000).toISOString() // Tomorrow
    });
  });
  
  logger.debug('AuthService initialized with test data', { 
    tokenCount: authData.tokens.size 
  });
}

// Initialize with test data
initTestData();

/**
 * Validate an ID tag and return its authorization status
 * 
 * @param {string} idTag - The ID tag to validate
 * @returns {object} Authorization status info
 */
function validateToken(idTag) {
  if (!idTag) {
    return { status: 'Invalid' };
  }
  
  // Check if we have this token in our database
  if (authData.tokens.has(idTag)) {
    const tokenData = authData.tokens.get(idTag);
    
    // Check if token is expired
    if (tokenData.status === 'Expired' || 
        (tokenData.expiryDate && new Date(tokenData.expiryDate) < new Date())) {
      return { 
        status: 'Expired',
        expiryDate: tokenData.expiryDate
      };
    }
    
    // Return stored status
    return {
      status: tokenData.status,
      expiryDate: tokenData.expiryDate,
      parentIdTag: tokenData.parentId
    };
  }
  
  // For special test tag
  if (idTag === 'TEST') {
    return {
      status: 'Accepted',
      expiryDate: new Date(Date.now() + 86400000).toISOString() // 24 hours
    };
  }
  
  // Default behavior based on environment
  return {
    status: process.env.NODE_ENV === 'production' ? 'Invalid' : 'Accepted'
  };
}

/**
 * Register a token in the system
 * 
 * @param {string} idTag - The ID tag to register
 * @param {string} status - The status of the token
 * @param {string} parentId - Optional parent ID tag
 * @returns {boolean} Success status
 */
function registerToken(idTag, status = 'Accepted', parentId = null) {
  if (!idTag) {
    return false;
  }
  
  authData.tokens.set(idTag, {
    status,
    parentId,
    expiryDate: new Date(Date.now() + 86400000).toISOString() // 24 hours
  });
  
  logger.debug('Token registered', { idTag, status });
  return true;
}

/**
 * Start an authorization session for a token
 * 
 * @param {string} idTag - The ID tag
 * @param {string} chargePointId - The charge point ID
 * @returns {object} Authorization status
 */
function startAuthorization(idTag, chargePointId) {
  // Validate the token first
  const authStatus = validateToken(idTag);
  
  if (authStatus.status === 'Accepted') {
    // Store the active authorization
    const authKey = `${chargePointId}:${idTag}`;
    authData.activeAuthorizations.set(authKey, {
      idTag,
      chargePointId,
      startTime: new Date().toISOString(),
      status: 'Active'
    });
    
    logger.debug('Authorization started', { idTag, chargePointId });
  }
  
  return authStatus;
}

/**
 * Check if a token is currently authorized at a charge point
 * 
 * @param {string} idTag - The ID tag
 * @param {string} chargePointId - The charge point ID
 * @returns {boolean} True if authorized
 */
function isAuthorized(idTag, chargePointId) {
  const authKey = `${chargePointId}:${idTag}`;
  return authData.activeAuthorizations.has(authKey);
}

/**
 * End an authorization session for a token
 * 
 * @param {string} idTag - The ID tag
 * @param {string} chargePointId - The charge point ID
 * @returns {boolean} Success status
 */
function endAuthorization(idTag, chargePointId) {
  const authKey = `${chargePointId}:${idTag}`;
  
  if (authData.activeAuthorizations.has(authKey)) {
    authData.activeAuthorizations.delete(authKey);
    logger.debug('Authorization ended', { idTag, chargePointId });
    return true;
  }
  
  return false;
}

module.exports = {
  validateToken,
  registerToken,
  startAuthorization,
  endAuthorization,
  isAuthorized
}; 