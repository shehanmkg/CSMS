import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Stations from './pages/Stations';
import Transactions from './pages/Transactions';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TestPage from './pages/TestPage';
import AppErrorBoundary from './AppErrorBoundary';
import theme from './theme';
import websocketService from './api/websocket';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App: React.FC = () => {
  useEffect(() => {
    // Try to connect to WebSocket but don't break the app if it fails
    try {
      websocketService.connect();
    } catch (err) {
      console.error("Failed to connect to WebSocket server:", err);
      // App will continue to work with polling fallback
    }

    return () => {
      try {
        websocketService.disconnect();
      } catch (err) {
        console.error("Error disconnecting from WebSocket:", err);
      }
    };
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <AppErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="stations" element={<Stations />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="users" element={<Users />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="test" element={<TestPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Router>
        <ToastContainer position="top-right" autoClose={5000} />
      </AppErrorBoundary>
    </ChakraProvider>
  );
};

export default App;
