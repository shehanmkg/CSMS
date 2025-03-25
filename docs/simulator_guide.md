# MicroOCPP Simulator Guide

This guide provides instructions for setting up and using the MicroOCPP simulator to test our CSMS implementation.

## Simulator Configuration

Use the following settings to configure the MicroOCPP simulator:

### Basic Settings

- **Backend URL**: `ws://[SERVER_IP]:9220/CP001`
  - Replace [SERVER_IP] with your server's IP address 
  - Use a unique charge point ID in the path (e.g., CP001, CP002)
- **Chargebox ID**: `CP001` (must match the ID in the URL path)
- **Protocol**: `ocpp1.6`
- **Ping Interval**: `30` (seconds)
- **Reconnect Interval**: `5` (seconds)

## Connection Troubleshooting

The MicroOCPP simulator is sensitive to protocol handling. If you have connection issues:

1. Make sure the Chargebox ID matches exactly the ID in the URL path
2. Verify the WebSocket URL format (ws://[SERVER_IP]:9220/CP001)
3. Ensure the server is running and listening on port 9220
4. Check server logs for protocol negotiation errors

## Testing Operations

### BootNotification

The BootNotification is automatically sent when the simulator connects. You can verify the BootNotification is processed correctly by:

1. Starting the CSMS server: `npm start`
2. Connecting the simulator with the settings above
3. Checking server logs for a successful BootNotification response
4. Visiting `http://localhost:9220/api/stations/CP001` to see the registered charge point data

### Heartbeat

The simulator will send Heartbeat messages at the interval specified in the BootNotification response. To test:

1. Ensure the simulator is connected
2. Wait for the heartbeat interval (default: 300 seconds)
3. Check the server logs for Heartbeat messages
4. Verify the `lastHeartbeat` timestamp in the station data is updating

You can also manually trigger a Heartbeat from the simulator interface if available.

### StatusNotification

Test the StatusNotification operation by:

1. Changing the connector status in the simulator (e.g., from Available to Charging)
2. Checking server logs for the StatusNotification message
3. Verifying the station data shows the updated status

## Monitoring Connections

You can monitor active connections and charge point status through the API:

- View all stations: `GET http://localhost:9220/api/stations`
- View a specific station: `GET http://localhost:9220/api/stations/CP001`

## Advanced Testing

For more advanced testing scenarios:

1. Modify the simulator to send different status values or error codes
2. Test error handling by sending malformed messages
3. Test reconnection behavior by stopping and starting the server while the simulator is connected 