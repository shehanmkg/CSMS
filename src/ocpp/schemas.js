/**
 * OCPP 1.6J Message Schemas for Validation
 */

// OCPP Message Types
const MESSAGE_TYPE = {
  CALL: 2,
  CALLRESULT: 3,
  CALLERROR: 4
};

// OCPP Actions
const ACTIONS = {
  BOOT_NOTIFICATION: 'BootNotification',
  HEARTBEAT: 'Heartbeat',
  STATUS_NOTIFICATION: 'StatusNotification',
  AUTHORIZE: 'Authorize',
  START_TRANSACTION: 'StartTransaction',
  STOP_TRANSACTION: 'StopTransaction',
  METER_VALUES: 'MeterValues'
};

// Schema Definitions
const SCHEMAS = {
  // Heartbeat has an empty payload in the request
  [ACTIONS.HEARTBEAT]: {
    request: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    response: {
      type: 'object',
      required: ['currentTime'],
      properties: {
        currentTime: {
          type: 'string',
          format: 'date-time'
        }
      },
      additionalProperties: false
    }
  },
  
  // StatusNotification schema
  [ACTIONS.STATUS_NOTIFICATION]: {
    request: {
      type: 'object',
      required: ['connectorId', 'errorCode', 'status'],
      properties: {
        connectorId: {
          type: 'integer',
          minimum: 0
        },
        errorCode: {
          type: 'string',
          enum: [
            'NoError', 
            'ConnectorLockFailure', 
            'EVCommunicationError', 
            'GroundFailure', 
            'HighTemperature', 
            'InternalError', 
            'LocalListConflict', 
            'OtherError', 
            'OverCurrentFailure', 
            'OverVoltage', 
            'PowerMeterFailure', 
            'PowerSwitchFailure', 
            'ReaderFailure', 
            'ResetFailure', 
            'UnderVoltage', 
            'WeakSignal'
          ]
        },
        status: {
          type: 'string',
          enum: [
            'Available', 
            'Preparing', 
            'Charging', 
            'SuspendedEVSE', 
            'SuspendedEV', 
            'Finishing', 
            'Reserved', 
            'Unavailable', 
            'Faulted'
          ]
        },
        info: {
          type: 'string',
          maxLength: 50
        },
        timestamp: {
          type: 'string',
          format: 'date-time'
        },
        vendorId: {
          type: 'string',
          maxLength: 255
        },
        vendorErrorCode: {
          type: 'string',
          maxLength: 50
        }
      },
      additionalProperties: false
    },
    response: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  
  // BootNotification schema (already implemented but defined here for completeness)
  [ACTIONS.BOOT_NOTIFICATION]: {
    request: {
      type: 'object',
      required: ['chargePointVendor', 'chargePointModel'],
      properties: {
        chargePointVendor: {
          type: 'string',
          maxLength: 50
        },
        chargePointModel: {
          type: 'string',
          maxLength: 50
        },
        chargePointSerialNumber: {
          type: 'string',
          maxLength: 50
        },
        chargeBoxSerialNumber: {
          type: 'string',
          maxLength: 50
        },
        firmwareVersion: {
          type: 'string',
          maxLength: 50
        },
        iccid: {
          type: 'string',
          maxLength: 20
        },
        imsi: {
          type: 'string',
          maxLength: 20
        },
        meterType: {
          type: 'string',
          maxLength: 50
        },
        meterSerialNumber: {
          type: 'string',
          maxLength: 50
        }
      },
      additionalProperties: false
    },
    response: {
      type: 'object',
      required: ['status', 'currentTime', 'interval'],
      properties: {
        status: {
          type: 'string',
          enum: ['Accepted', 'Pending', 'Rejected']
        },
        currentTime: {
          type: 'string',
          format: 'date-time'
        },
        interval: {
          type: 'integer',
          minimum: 1
        }
      },
      additionalProperties: false
    }
  }
};

/**
 * Validate an OCPP message against its schema
 * @param {string} action - The OCPP action (message type)
 * @param {object} payload - The message payload to validate
 * @param {boolean} isResponse - Whether this is a response message (default: false)
 * @returns {object} - Validation result with success flag and optional error
 */
function validateOcppMessage(action, payload, isResponse = false) {
  try {
    // Get the schema for this action
    const schema = SCHEMAS[action];
    
    if (!schema) {
      return {
        success: false,
        error: `No schema defined for action: ${action}`
      };
    }
    
    // Select request or response schema
    const targetSchema = isResponse ? schema.response : schema.request;
    
    // Simple schema validation (in a production app, use a library like Ajv)
    // This is a basic implementation for demonstration purposes
    if (targetSchema.required) {
      for (const requiredProp of targetSchema.required) {
        if (payload[requiredProp] === undefined) {
          return {
            success: false,
            error: `Missing required property: ${requiredProp}`
          };
        }
      }
    }
    
    // Check property types (basic validation only)
    for (const prop in payload) {
      const propDef = targetSchema.properties[prop];
      
      // Check if property is allowed
      if (!propDef && !targetSchema.additionalProperties) {
        return {
          success: false,
          error: `Unknown property: ${prop}`
        };
      }
      
      // Skip type checking if property not defined in schema
      if (!propDef) continue;
      
      // Basic type checking
      const value = payload[prop];
      
      if (propDef.type === 'string' && typeof value !== 'string') {
        return {
          success: false,
          error: `Property ${prop} must be a string`
        };
      }
      
      if (propDef.type === 'integer' && !Number.isInteger(value)) {
        return {
          success: false,
          error: `Property ${prop} must be an integer`
        };
      }
      
      // String length validation
      if (propDef.type === 'string' && propDef.maxLength && value.length > propDef.maxLength) {
        return {
          success: false,
          error: `Property ${prop} exceeds maximum length of ${propDef.maxLength}`
        };
      }
      
      // Enum validation
      if (propDef.enum && !propDef.enum.includes(value)) {
        return {
          success: false,
          error: `Property ${prop} must be one of: ${propDef.enum.join(', ')}`
        };
      }
      
      // Basic number validation
      if (propDef.type === 'integer' && propDef.minimum !== undefined && value < propDef.minimum) {
        return {
          success: false,
          error: `Property ${prop} must be at least ${propDef.minimum}`
        };
      }
    }
    
    // If we got here, validation passed
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error.message}`
    };
  }
}

module.exports = {
  MESSAGE_TYPE,
  ACTIONS,
  SCHEMAS,
  validateOcppMessage
}; 