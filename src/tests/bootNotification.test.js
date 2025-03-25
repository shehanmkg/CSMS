const handleBootNotification = require('../ocpp/handlers/bootNotification');

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('BootNotification Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should accept a valid boot notification and return a proper response', async () => {
    // Valid payload as per OCPP 1.6J
    const payload = {
      chargePointVendor: 'VendorX',
      chargePointModel: 'ModelY',
      chargePointSerialNumber: 'SN123456',
      firmwareVersion: '1.0.0'
    };

    const chargePointId = 'CP001';
    const result = await handleBootNotification(payload, chargePointId);

    // Check that response has the expected structure
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('currentTime');
    expect(result).toHaveProperty('interval');

    // Validate response values
    expect(result.status).toBe('Accepted');
    expect(typeof result.currentTime).toBe('string');
    expect(typeof result.interval).toBe('number');
    expect(result.interval).toBeGreaterThan(0);

    // Ensure currentTime is a valid ISO date string
    expect(() => new Date(result.currentTime)).not.toThrow();
  });

  it('should throw an error if chargePointVendor is missing', async () => {
    const payload = {
      chargePointModel: 'ModelY'
    };

    const chargePointId = 'CP001';
    await expect(handleBootNotification(payload, chargePointId))
      .rejects
      .toThrow('Missing required field: chargePointVendor');
  });

  it('should throw an error if chargePointModel is missing', async () => {
    const payload = {
      chargePointVendor: 'VendorX'
    };

    const chargePointId = 'CP001';
    await expect(handleBootNotification(payload, chargePointId))
      .rejects
      .toThrow('Missing required field: chargePointModel');
  });

  it('should handle optional fields correctly', async () => {
    // Valid payload with optional fields
    const payload = {
      chargePointVendor: 'VendorX',
      chargePointModel: 'ModelY',
      chargePointSerialNumber: 'SN123456',
      firmwareVersion: '1.0.0',
      iccid: 'ICC123456789',
      imsi: 'IMSI123456789',
      meterType: 'ElectricityMeter',
      meterSerialNumber: 'MSN123456'
    };

    const chargePointId = 'CP001';
    const result = await handleBootNotification(payload, chargePointId);

    // Check that response is correct
    expect(result.status).toBe('Accepted');

    // Verify the debug log for additional info was called
    const { logger } = require('../utils/logger');
    expect(logger.debug).toHaveBeenCalledWith('Additional boot info', {
      chargePointId,
      serialNumber: payload.chargePointSerialNumber,
      firmwareVersion: payload.firmwareVersion,
      iccid: payload.iccid,
      imsi: payload.imsi,
      meterType: payload.meterType,
      meterSerialNumber: payload.meterSerialNumber
    });
  });
}); 