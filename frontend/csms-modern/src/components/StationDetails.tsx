import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box,
  Flex,
  Text,
  Badge,
  VStack,
  HStack,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Heading,
  OrderedList,
  ListItem
} from '@chakra-ui/react';
import { toast } from 'react-toastify';
import { ChargingStation, Transaction, Connector, connectionManager, stationsApi, transactionsApi } from '../api/api';
import PaymentModal from './PaymentModal';
import websocketService, { WebSocketEvent, WebSocketEventHandler } from '../api/websocket';

interface StationDetailsProps {
  station: ChargingStation;
  isOpen: boolean;
  onClose: () => void;
  initialTabIndex?: number;
}

const StationDetails: React.FC<StationDetailsProps> = ({ station, isOpen, onClose, initialTabIndex = 0 }) => {
  const [tabIndex, setTabIndex] = useState(initialTabIndex);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [updatedStation, setUpdatedStation] = useState<ChargingStation>(station);
  const [connectors, setConnectors] = useState<Connector[]>(station.connectors || []);
  const [error, setError] = useState<string | null>(null);

  // Define WebSocket handlers in the component scope
  const handleStationUpdate: WebSocketEventHandler = (data) => {
    console.log('Station update received in details:', data);
    if (data.chargePointId === station.id) {
      fetchStationData();
    }
  };

  const handleConnectorUpdate: WebSocketEventHandler = (data) => {
    console.log('Connector update received in details:', data);
    if (data.chargePointId === station.id) {
      fetchStationData();
    }
  };

  const handlePaymentUpdate: WebSocketEventHandler = (data) => {
    console.log('Payment update received in details:', data);
    if (data.chargePointId === station.id) {
      fetchStationData();
      toast.success(`Payment completed for connector ${data.connectorId}`);
    }
  };

  // Define mutable isMounted variable for tracking component mounting state
  let isMounted = true;

  // Define loadTransactions function at component level scope
  const loadTransactions = async (stationId: string) => {
    if (!isMounted) return;

    try {
      const stationTransactions = await transactionsApi.getByStationId(stationId);
      if (isMounted) {
        setTransactions(stationTransactions);
      }
    } catch (error) {
      console.error(`Error loading transactions for station ${stationId}:`, error);
    }
  };

  // Define fetchStationData at component level scope to make it accessible everywhere in the component
  const fetchStationData = async () => {
    try {
      setIsLoading(true);
      const data = await stationsApi.getById(station.id);
      if (isMounted) {
        setUpdatedStation(data);
        setConnectors(data.connectors || []);
        setError(null);
        // Update transactions for this station
        loadTransactions(station.id);
      }
    } catch (error) {
      console.error(`Error fetching station ${station.id}:`, error);
      if (isMounted) {
        setError('Failed to load station details');
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  // Use the fetchStationData function inside the useEffect
  useEffect(() => {
    // Reset isMounted flag at the start of effect
    isMounted = true;

    if (station.id) {
      fetchStationData();

      // Connect to WebSocket
      try {
        websocketService.connect();

        // Subscribe to this station
        websocketService.subscribe(station.id);

        // Set up event handlers using definitions from component scope
        websocketService.on('station_update', handleStationUpdate);
        websocketService.on('connector_update', handleConnectorUpdate);
        websocketService.on('payment_update', handlePaymentUpdate);
      } catch (err) {
        console.error("Error setting up WebSocket in StationDetails:", err);
      }

      // Set polling as fallback
      const intervalId = setInterval(fetchStationData, 10000);

      // Cleanup function
      return () => {
        isMounted = false; // Update isMounted flag
        clearInterval(intervalId);

        // Remove event listeners and unsubscribe
        try {
          websocketService.off('station_update', handleStationUpdate);
          websocketService.off('connector_update', handleConnectorUpdate);
          websocketService.off('payment_update', handlePaymentUpdate);
          websocketService.unsubscribe(station.id);
        } catch (err) {
          // Log the specific error during cleanup
          console.error("Error cleaning up WebSocket in StationDetails:", err);
        }
      };
    }

    return () => {
      // Set isMounted to false when component unmounts or effect re-runs
      isMounted = false;
    };
  }, [station.id]); // Keep station.id, fetchStationData (if it depends on props/state), and handlers in deps

  // When tab changes, start/stop appropriate polling
  useEffect(() => {
    if (!isOpen) return;

    if (tabIndex === 1) {
      // Transactions tab - start polling transactions
      connectionManager.startPolling(`transactions_${station.id}`, () => fetchTransactionData(station.id));
    } else {
      // Other tabs - stop polling transactions
      connectionManager.stopPolling(`transactions_${station.id}`);
    }
  }, [tabIndex, station.id, isOpen]);

  const fetchTransactionData = async (stationId: string) => {
    try {
      const stationTransactions = await transactionsApi.getByStationId(stationId);
      setTransactions(stationTransactions);
    } catch (error) {
      console.error(`Error fetching transactions for station ${stationId}:`, error);
      toast.error('Failed to load transaction data. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Helper function to safely format power, handling potential object structure
  const formatPowerValue = (power: number | { value: number; unit?: string } | null | undefined): string => {
    if (typeof power === 'object' && power !== null && 'value' in power && typeof power.value === 'number') {
      return `${power.value} ${power.unit || 'kW'}`;
    }
    if (typeof power === 'number') {
      return `${power} kW`;
    }
    return 'N/A kW'; // Default or fallback value
  };

  // Helper function to safely format energy, handling potential object structure
  const formatEnergyValue = (energy: number | { value: number; unit?: string } | null | undefined): string => {
    if (typeof energy === 'object' && energy !== null && 'value' in energy && typeof energy.value === 'number') {
      return `${energy.value.toFixed(1)} ${energy.unit || 'kWh'}`;
    }
    if (typeof energy === 'number') {
      return `${energy.toFixed(1)} kWh`;
    }
    return '— kWh';
  };

  // Helper function to safely format currency, handling potential object structure
  const formatCurrencyValue = (amount: number | { value: number; unit?: string } | null | undefined, currencySymbol = '$'): string => {
    if (typeof amount === 'object' && amount !== null && 'value' in amount && typeof amount.value === 'number') {
      return `${currencySymbol}${amount.value.toFixed(2)} ${amount.unit || ''}`.trim();
    }
    if (typeof amount === 'number') {
      return `${currencySymbol}${amount.toFixed(2)}`;
    }
    return '—';
  };

  const getStatusBadge = (status: string) => {
    let colorScheme = 'gray';

    if (!status) {
      return <Badge colorScheme="gray">Unknown</Badge>;
    }

    switch (status.toLowerCase()) {
      case 'available':
        colorScheme = 'green';
        break;
      case 'charging':
        colorScheme = 'blue';
        break;
      case 'preparing':
        colorScheme = 'purple';
        break;
      case 'faulted':
        colorScheme = 'red';
        break;
      case 'unavailable':
        colorScheme = 'orange';
        break;
      case 'reserved':
        colorScheme = 'yellow';
        break;
      case 'completed':
        colorScheme = 'green';
        break;
      case 'finishing':
        colorScheme = 'green';
        return <Badge colorScheme={colorScheme}>Completed</Badge>;
      case 'in progress':
        colorScheme = 'blue';
        break;
      default:
        colorScheme = 'gray';
    }

    return <Badge colorScheme={colorScheme}>{status}</Badge>;
  };

  // Get available connectors for charging
  const getPreparingConnectors = (): Connector[] => {
    if (!updatedStation.connectors) return [];

    // Handle both array and object formats
    if (Array.isArray(updatedStation.connectors)) {
      return updatedStation.connectors.filter(c => c.status === 'Preparing');
    } else {
      return Object.entries(updatedStation.connectors)
        .map(([id, connector]) => ({
          ...connector,
          id: id
        }))
        .filter(c => c.status === 'Preparing');
    }
  };

  const handleStartCharging = (connectorId?: string) => {
    // Find connectors in Preparing status
    const preparingConnectors = getPreparingConnectors();

    if (preparingConnectors.length === 0) {
      toast.error("No connectors ready for payment. There are no connectors in the 'Preparing' state.");
      return;
    }

    // If a specific connector ID is provided, check if it's in Preparing status
    if (connectorId) {
      const connector = preparingConnectors.find(c => c.id === connectorId);
      if (!connector) {
        toast.error(`Connector ${connectorId} is not in the 'Preparing' state.`);
        return;
      }
      setSelectedConnectorId(connectorId);
    }

    // Open payment modal
    setIsPaymentModalOpen(true);
  };

  const handlePaymentComplete = () => {
    // Close payment modal
    setIsPaymentModalOpen(false);

    // Show a success message
    toast.success("Payment successful. Charging session has started.");

    // Request immediate data refresh with accelerated polling temporarily
    connectionManager.startPolling(`station_${station.id}`, () => fetchStationData(station.id));
    connectionManager.startPolling(`transactions_${station.id}`, () => fetchTransactionData(station.id));
  };

  const handleStopCharging = async (connectorId: string) => {
    toast.info(`Requesting to stop charging on connector ${connectorId}...`);
    try {
      // Call the backend API to stop the transaction
      // NOTE: Ensure stationsApi.stopCharging is implemented in api.ts
      //       and the corresponding backend endpoint exists.
      await stationsApi.stopCharging(updatedStation.id, connectorId);

      toast.success(`Stop command sent for connector ${connectorId}. Station will update shortly.`);

      // Optionally trigger a slightly faster poll temporarily after sending command
      fetchStationData(); 
      fetchTransactionData(updatedStation.id);

    } catch (error) {
      console.error(`Error stopping charging on connector ${connectorId}:`, error);
      toast.error(`Failed to stop charging. ${error.message || 'Please try again.'}`);
    }
  };

  const handleModalClose = () => {
    // Clean up polling when modal closes
    connectionManager.stopPolling(`station_${station.id}`);
    connectionManager.stopPolling(`transactions_${station.id}`);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleModalClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Station {updatedStation.id}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box mb={6}>
              <HStack spacing={4} mb={3}>
                <Text fontWeight="bold">Status:</Text>
                {getStatusBadge(updatedStation.status || 'Unknown')}
              </HStack>

              <HStack spacing={4} mb={3}>
                <Text fontWeight="bold">Model:</Text>
                <Text>{updatedStation.model}</Text>
                <Text fontWeight="bold">Vendor:</Text>
                <Text>{updatedStation.vendor}</Text>
              </HStack>

              <HStack spacing={4} mb={3}>
                <Text fontWeight="bold">Last Heartbeat:</Text>
                <Text>{formatDate(updatedStation.lastHeartbeat || '')}</Text>
              </HStack>

              {updatedStation.firmwareVersion && (
                <HStack spacing={4} mb={3}>
                  <Text fontWeight="bold">Firmware:</Text>
                  <Text>{updatedStation.firmwareVersion}</Text>
                  {updatedStation.updateAvailable && (
                    <Badge colorScheme="purple">Update Available</Badge>
                  )}
                </HStack>
              )}

              <Divider my={4} />

              <Heading size="sm" mb={3}>Connectors</Heading>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>ID</Th>
                    <Th>Type</Th>
                    <Th>Power</Th>
                    <Th>Status</Th>
                    <Th>Meter Value</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Array.isArray(updatedStation.connectors) && updatedStation.connectors.map((connector, idx) => (
                    <Tr key={idx}>
                      <Td>{connector.id}</Td>
                      <Td>{connector.type || 'Unknown'}</Td>
                      <Td>
                        {formatPowerValue(connector.power)}
                      </Td>
                      <Td>{getStatusBadge(connector.status || 'Unknown')}</Td>
                      <Td>
                        {connector.meterValue && typeof connector.meterValue === 'object' ? (
                          <Text>
                            {connector.meterValue.value !== undefined && connector.meterValue.value !== null ?
                              (typeof connector.meterValue.value === 'object' ?
                                JSON.stringify(connector.meterValue.value) :
                                String(connector.meterValue.value))
                              : '0'}
                            {' '}{typeof connector.meterValue.unit === 'string' ? connector.meterValue.unit : 'Wh'}
                            {connector.meterValue.timestamp && typeof connector.meterValue.timestamp === 'string' && (
                              <Text as="span" fontSize="xs" color="gray.500" ml={1}>
                                ({formatDate(connector.meterValue.timestamp)})
                              </Text>
                            )}
                          </Text>
                        ) : (
                          <Text color="gray.500">No data</Text>
                        )}
                      </Td>
                      <Td>
                        {connector.status === 'Available' && (
                          <Text fontSize="sm" color="gray.500">
                            Plugged Out
                          </Text>
                        )}
                        {connector.status === 'Preparing' && (
                          <Button
                            size="sm"
                            colorScheme="green"
                            onClick={() => handleStartCharging(connector.id)}
                          >
                            Pay Now
                          </Button>
                        )}
                        {connector.status === 'Charging' && (
                          <Button
                            size="sm"
                            colorScheme="red"
                            onClick={() => handleStopCharging(connector.id)}
                          >
                            Stop
                          </Button>
                        )}
                        {connector.status === 'Faulted' && (
                          <Button
                            size="sm"
                            colorScheme="orange"
                            onClick={() => {
                              toast.info(`Attempting to reset connector ${connector.id}`);
                            }}
                          >
                            Reset
                          </Button>
                        )}
                        {connector.status !== 'Available' &&
                         connector.status !== 'Charging' &&
                         connector.status !== 'Faulted' &&
                         connector.status !== 'Preparing' && (
                          <Button size="sm" isDisabled>
                            Unavailable
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>

            <Tabs
              isFitted
              variant="enclosed"
              colorScheme="blue"
              index={tabIndex}
              onChange={setTabIndex}
            >
              <TabList mb="1em">
                <Tab>Actions</Tab>
                <Tab>Transactions</Tab>
                <Tab>Logs</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Box p={4} bg="gray.50" borderRadius="md">
                      <Text fontWeight="medium" mb={2}>Charging Instructions:</Text>
                      <OrderedList spacing={2} pl={5}>
                        <ListItem>Connect your vehicle to an available charging connector</ListItem>
                        <ListItem>Connector status will change to "Preparing" (purple)</ListItem>
                        <ListItem>Click "Pay Now" to process payment</ListItem>
                        <ListItem>Once payment is complete, charging will begin automatically</ListItem>
                      </OrderedList>
                    </Box>

                    <Button
                      colorScheme="blue"
                      onClick={() => handleStartCharging()}
                      isDisabled={!Array.isArray(updatedStation.connectors) || !updatedStation.connectors.some(c => c.status === 'Preparing')}
                    >
                      Pay Now
                    </Button>

                    <Button
                      colorScheme="purple"
                      isDisabled={!updatedStation.updateAvailable}
                    >
                      Update Firmware
                    </Button>

                    <Button colorScheme="orange">
                      Reset Station
                    </Button>
                  </VStack>
                </TabPanel>

                <TabPanel>
                  {isLoading && transactions.length === 0 ? (
                    <Flex justify="center" align="center" minH="200px">
                      <Spinner />
                    </Flex>
                  ) : (
                    transactions.length > 0 ? (
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th>ID</Th>
                            <Th>Start Time</Th>
                            <Th>End Time</Th>
                            <Th>Status</Th>
                            <Th>Energy</Th>
                            <Th>Cost</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {transactions.map(tx => (
                            <Tr key={tx.id}>
                              <Td>{tx.id}</Td>
                              <Td>{formatDate(tx.startTime)}</Td>
                              <Td>{tx.endTime ? formatDate(tx.endTime) : '—'}</Td>
                              <Td>{getStatusBadge(tx.status)}</Td>
                              <Td>{formatEnergyValue(tx.consumedEnergy)}</Td>
                              <Td>{formatCurrencyValue(tx.amount)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <Text color="gray.500" textAlign="center" py={8}>
                        No transactions found for this station
                      </Text>
                    )
                  )}
                </TabPanel>

                <TabPanel>
                  <Text color="gray.500" textAlign="center" py={8}>
                    No log entries available
                  </Text>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>

          <ModalFooter>
            <Button onClick={handleModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          station={updatedStation}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </>
  );
};

export default StationDetails;