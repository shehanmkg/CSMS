# EV Charging Station Management System (CSMS) Frontend

A modern, responsive dashboard for managing electric vehicle charging stations built with React, TypeScript, Chakra UI, and Vite.

## Features

- **Responsive Design**: Works seamlessly on desktops, tablets, and mobile devices
- **Dark Mode Support**: Built-in light/dark mode toggle
- **Real-time Monitoring**: View status and metrics for charging stations
- **Transaction Management**: Track and manage charging sessions
- **User Management**: Manage operators and end-users
- **Analytics Dashboard**: Visualize usage and performance data
- **Clean Modern UI**: Built with Chakra UI components

## Tech Stack

- **React 18**: Component-based UI library
- **TypeScript**: Type-safe JavaScript
- **Chakra UI v3**: Component library for consistent, accessible UI
- **React Router v6**: Routing and navigation
- **Axios**: HTTP client for API requests
- **Vite**: Fast build tool and development server
- **Recharts**: Flexible charting library for analytics

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ev-csms/frontend/csms-modern
```

2. Install dependencies:
```bash
yarn install
# or
npm install
```

3. Start the development server:
```bash
yarn dev
# or
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
src/
├── api/            # API services and data fetching logic
├── components/     # Reusable UI components
├── pages/          # Page components for each route
├── theme.ts        # Custom theme configuration
├── App.tsx         # Main application component with routing
└── main.tsx        # Application entry point
```

## Available Scripts

- `yarn dev` - Start the development server
- `yarn build` - Create a production build
- `yarn preview` - Preview the production build locally
- `yarn lint` - Run ESLint
- `yarn test` - Run tests

## Connecting to Backend

The frontend expects a backend server running with the following API endpoints:

- `/api/stations` - Charging station data
- `/api/transactions` - Charging session data
- `/api/dashboard/stats` - Dashboard statistics
- `/api/users` - User management endpoints

## License

[MIT](LICENSE)

## Acknowledgements

- [Chakra UI](https://chakra-ui.com/)
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
