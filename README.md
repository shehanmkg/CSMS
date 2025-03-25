# Charging Station Management System (CSMS)

A server implementation of the Open Charge Point Protocol (OCPP) 1.6J for managing EV charging stations.

## Features

- **OCPP 1.6J Compliant WebSocket Server**
- **Charge Point Management** - Track the status and details of connected charging stations
- **REST API** - Monitor charging stations through a simple API
- **Extensible Architecture** - Easily add support for additional OCPP operations

### Currently Implemented OCPP Operations

- ✅ BootNotification
- ✅ Heartbeat
- ✅ StatusNotification
- ⬜ Authorize
- ⬜ StartTransaction
- ⬜ StopTransaction
- ⬜ MeterValues
- ⬜ DataTransfer

## Setup

### Prerequisites

- Node.js 16+ and npm/yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/csms.git
   cd csms
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env to match your environment
   ```

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Testing

### Running Tests

```bash
npm test
```

### Watch Mode (for development)

```bash
npm run test:watch
```

## Simulator Testing

This project includes a guide for testing with the MicroOCPP simulator.

See [Simulator Guide](docs/simulator_guide.md) for details on setting up and using the simulator.

## API Endpoints

### Health Check

```
GET /health
```

### Stations API

```
GET /api/stations
GET /api/stations/:id
```

## Project Structure

```
.
├── docs/                  # Documentation
├── logs/                  # Log files
├── src/
│   ├── ocpp/              # OCPP message handling
│   │   ├── handlers/      # OCPP operation handlers
│   │   └── ...
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   ├── websocket/         # WebSocket server
│   ├── middleware/        # Express middleware
│   ├── tests/             # Test files
│   └── app.js             # Express application setup
└── .env                   # Environment variables
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 