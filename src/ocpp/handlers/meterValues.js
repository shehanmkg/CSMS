const { logger } = require('../../utils/logger');
const transactionService = require('../../services/transactionService');
const stationService = require('../../services/stationService');

/**
 * MeterValues handler
 * 
 * This handler processes meter values sent by a charge point during a transaction.
 * It validates the data and stores the readings in the relevant transaction.
 * 
 * @param {object} payload - The MeterValues request payload
 * @param {string} chargePointId - The ID of the charge point
 * @returns {object} - The MeterValues response (empty object as per OCPP 1.6J)
 */
async function handleMeterValues(payload, chargePointId) {
  logger.info('MeterValues request received', {
    chargePointId,
    connectorId: payload.connectorId,
    transactionId: payload.transactionId,
    meterValuesCount: payload.meterValue ? payload.meterValue.length : 0
  });

  // Validate required fields
  if (payload.connectorId === undefined) {
    throw new Error('Missing required field: connectorId');
  }
  
  if (!payload.meterValue || !Array.isArray(payload.meterValue) || payload.meterValue.length === 0) {
    throw new Error('Missing or invalid required field: meterValue');
  }
  
  // Get charge point information
  const chargePoint = stationService.getChargePoint(chargePointId);
  
  if (!chargePoint) {
    logger.warn('MeterValues failed - Charge point not registered', {
      chargePointId
    });
    
    throw new Error('Charge point not registered');
  }
  
  try {
    // Process each meter value
    const processedValues = processMeterValues(payload.meterValue);
    
    // If transactionId is provided, add these values to the transaction
    if (payload.transactionId) {
      const added = transactionService.addMeterValue(
        payload.transactionId, 
        payload.connectorId, 
        processedValues
      );
      
      if (added) {
        logger.debug('Meter values added to transaction', {
          chargePointId,
          transactionId: payload.transactionId,
          values: processedValues
        });
      } else {
        logger.warn('Failed to add meter values - Transaction not found', {
          chargePointId,
          transactionId: payload.transactionId
        });
      }
    } else {
      // For non-transaction readings, just log them
      logger.debug('Non-transaction meter values received', {
        chargePointId,
        connectorId: payload.connectorId,
        values: processedValues
      });
    }
    
    // Update the charge point's last known meter value if it's a relevant energy reading
    updateChargePointMeterValue(chargePointId, payload.connectorId, processedValues);
    
    // Return empty object as per OCPP 1.6J spec
    return {};
    
  } catch (error) {
    logger.error('Error processing meter values', {
      chargePointId,
      connectorId: payload.connectorId,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Process raw meter values into a standardized format
 * 
 * @param {Array} meterValues - Array of meter value objects from the charge point
 * @returns {Array} - Processed meter values in standardized format
 */
function processMeterValues(meterValues) {
  return meterValues.map(meterValue => {
    // Ensure timestamp exists, or use current time
    const timestamp = meterValue.timestamp || new Date().toISOString();
    
    // Process each sampled value in this meter value
    const processedSamples = meterValue.sampledValue.map(sample => {
      return {
        value: sample.value,
        context: sample.context || 'Sample.Periodic',
        format: sample.format || 'Raw',
        measurand: sample.measurand || 'Energy.Active.Import.Register',
        unit: sample.unit || (sample.measurand && sample.measurand.includes('Energy') ? 'Wh' : '')
      };
    });
    
    return {
      timestamp,
      sampledValue: processedSamples
    };
  });
}

/**
 * Update the charge point's last known meter value
 * 
 * @param {string} chargePointId - The ID of the charge point
 * @param {number} connectorId - The connector ID
 * @param {Array} processedValues - The processed meter values
 */
function updateChargePointMeterValue(chargePointId, connectorId, processedValues) {
  // Find the latest Energy.Active.Import.Register reading
  let latestEnergyReading = null;
  let latestTimestamp = null;
  
  for (const meterValue of processedValues) {
    for (const sample of meterValue.sampledValue) {
      if (sample.measurand === 'Energy.Active.Import.Register' || 
          sample.measurand === 'Energy.Active.Import.Interval') {
        if (!latestTimestamp || meterValue.timestamp > latestTimestamp) {
          latestEnergyReading = {
            value: parseFloat(sample.value),
            unit: sample.unit || 'Wh',
            timestamp: meterValue.timestamp
          };
          latestTimestamp = meterValue.timestamp;
        }
      }
    }
  }
  
  // If we found an energy reading, update the charge point
  if (latestEnergyReading) {
    stationService.updateChargePointMeterValue(
      chargePointId,
      connectorId,
      latestEnergyReading
    );
    
    logger.debug('Updated charge point meter value', {
      chargePointId,
      connectorId,
      meterValue: latestEnergyReading
    });
  }
}

module.exports = handleMeterValues; 