# CSMS Development Rules and Guidelines

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