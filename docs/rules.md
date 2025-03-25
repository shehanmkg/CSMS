# CSMS Development Rules and Guidelines

## Development Workflow Rules
1. Focus on code implementation only - no server execution
2. Wait for user to provide logs and error messages
3. Respond to issues based on provided logs
4. Document all configurations and requirements clearly

## MicroOCPP Simulator Usage Rules

This document outlines the rules and configuration guidelines for using the MicroOCPP simulator to test the Charging Station Management System (CSMS).

### 1. Simulator Configuration

When setting up the MicroOCPP simulator, use the following configuration parameters:

#### Backend URL
- **Format**: `ws://192.168.4.43:9220/CP001`
- **Explanation**: Use the actual IP address of the host machine (192.168.4.43) to connect to the CSMS server running on port 9220.
- **Validation Rules**: The URL must use WebSocket protocol (ws://) and include the chargeBoxId in the path.

#### Chargebox ID
- **Format**: `CP001` (for testing station 1)
- **Requirements**: Must match the ID in the Backend URL path
- **Validation Rules**: Alphanumeric characters, no spaces

#### Protocol
- **Value**: `ocpp1.6`
- **Requirements**: Fixed value for our implementation
- **Validation Rules**: Must be exactly as specified

#### Connection Settings
- **Ping Interval**: `5` (seconds)
- **Reconnect Interval**: `10` (seconds)
- **Validation Rules**: Integer values only

### 2. Testing Boundaries

When using the simulator for testing, observe the following boundaries:

- **Message Size**: Maximum 10KB
- **Concurrent Connections**: Test with up to 5 simultaneous connections
- **Connection Stability**: Test reconnection scenarios
- **Error Handling**: Test with malformed messages to verify error handling

### 3. Development Workflow

When developing and testing with the simulator:

1. Start the CSMS server first (`npm run dev`)
2. Verify the WebSocket server is running on port 9220
3. Configure the simulator with the settings above
4. Connect and verify communication
5. Run test scenarios as documented in the test plan

### 4. Common Issues and Solutions

If experiencing connection issues:

1. Verify the CSMS server is running and listening on port 9220
2. Make sure the Backend URL uses the host machine's actual IP address (192.168.4.43) instead of `localhost` or `host.docker.internal`
   - To find your host IP address, run: `ifconfig | grep "inet " | grep -v 127.0.0.1` (macOS/Linux) or `ipconfig` (Windows)
   - The IP address might change if you connect to different networks, so update as needed
3. Check that the chargeBoxId in the URL matches the configured chargeBoxId
4. Ensure the Docker container for the simulator is running correctly
5. If all else fails, restart both the simulator and CSMS server

For message transmission issues:

1. Check message format conforms to OCPP 1.6J specification
2. Verify all required fields are present
3. Inspect server logs for detailed error messages

### 5. Logging Requirements

Always ensure logging is enabled for:

- Connection attempts
- Message transmission
- Error scenarios
- Disconnection events

The logs should be saved for analysis and debugging purposes.

## MicroOCPP Simulator Integration Rules

### 1. Simulator Usage Guidelines
- Use MicroOCPP simulator as-is without modifications
- Treat simulator as a black box representing real charging stations
- Document all simulator configurations used for testing
- Version control simulator configurations, not simulator code

### 2. Testing Boundaries
- CSMS must handle all OCPP 1.6J messages from simulator
- Test both valid and invalid message sequences
- Do not assume simulator behavior beyond OCPP 1.6J spec
- Log all simulator interactions for debugging

### 3. Simulator Test Scenarios
#### Basic Operations
- Boot notification sequence
- Heartbeat monitoring
- Status notifications
- Start/Stop transactions
- Meter values

#### Error Scenarios
- Connection drops
- Message timeouts
- Invalid message formats
- Protocol errors
- Concurrent operations

#### Load Testing
- Multiple simultaneous connections
- High frequency messages
- Long-running sessions
- Network latency simulation

### 4. Development Workflow
1. Write test case specification
2. Configure simulator for test case
3. Implement CSMS feature
4. Run tests against simulator
5. Document results and any simulator-specific behaviors

### 5. Documentation Requirements
- Simulator configuration for each test scenario
- Expected message sequences
- Known simulator limitations
- Troubleshooting guidelines
- Test environment setup

### 6. Quality Assurance
- Maintain test coverage metrics
- Regular regression testing
- Performance benchmarking
- Security testing within simulator boundaries

## Integration Guidelines

### 1. Communication Protocol
- Strict adherence to OCPP 1.6J
- WebSocket secure connection handling
- Message format validation
- Error handling procedures

### 2. Data Management
- Clear separation of simulator and production data
- Test data isolation
- Audit logging of all transactions
- Regular data cleanup

### 3. Performance Metrics
- Response time tracking
- Connection stability monitoring
- Resource usage benchmarks
- Scalability testing parameters

### 4. Security Considerations
- Authentication handling
- Authorization flows
- Data encryption
- Session management

## Best Practices

### 1. Code Organization
- Clear separation of OCPP handling logic
- Modular test implementations
- Configuration management
- Error handling strategies

### 2. Testing Strategy
- Unit tests for CSMS components
- Integration tests with simulator
- End-to-end test scenarios
- Performance test suites

### 3. Monitoring
- Real-time logging
- Error tracking
- Performance monitoring
- Usage analytics

### 4. Documentation
- API specifications
- Test case documentation
- Configuration guides
- Troubleshooting procedures

## Simulator Limitations
- Document any known simulator limitations
- Handle simulator-specific edge cases
- Plan for real-world scenarios beyond simulator capabilities
- Regular validation against OCPP specification 