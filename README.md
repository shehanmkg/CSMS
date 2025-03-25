# CSMS (Charging Station Management System) POC

A Proof of Concept implementation of a Charging Station Management System using OCPP 1.6J protocol.

## Project Structure

```
├── src/
│   ├── app.js              # Application entry point
│   ├── websocket/          # WebSocket server implementation
│   ├── ocpp/              # OCPP message handlers
│   ├── middleware/        # Express and WebSocket middleware
│   └── utils/            # Utility functions and logger
├── logs/                 # Application logs
├── tests/               # Test files
└── docs/               # Documentation
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MicroOCPP simulator (for testing)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
4. Configure your environment variables in `.env`

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Testing

Run tests:
```bash
npm test
```

## WebSocket Connection

The OCPP WebSocket server accepts connections at:
```
ws://localhost:9220/ocpp/{chargePointId}
```

Example URL for a charge point with ID "CP001":
```
ws://localhost:9220/ocpp/CP001
```

## OCPP Protocol

This implementation supports OCPP 1.6J and handles the following message types:
- Call (2)
- CallResult (3)
- CallError (4)

## Logging

Logs are stored in the `logs` directory:
- `csms.log`: General application logs
- `ocpp.log`: OCPP message logs

## Development

1. Follow the TDD approach
2. Write tests before implementing features
3. Use the MicroOCPP simulator for testing
4. Document all changes and new features

## Security Notes

1. Implement proper authentication in production
2. Use secure WebSocket (WSS) in production
3. Configure appropriate firewall rules
4. Regular security audits recommended

## License

[Your License Here] 