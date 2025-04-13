import React, { useState, useEffect, useCallback } from 'react';
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
  ListItem,
  SimpleGrid,
  TableContainer
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
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [updatedStation, setUpdatedStation] = useState<ChargingStation>(station);
  const [error, setError] = useState<string | null>(null);

  // --- Callback Definitions (Order matters for dependencies) ---

  // 1. loadTransactions
  const loadTransactions = useCallback(async (stationId: string, signal?: AbortSignal) => {
    // No direct isMounted check needed here if caller handles it or uses signal
    try {
      const stationTransactions = await transactionsApi.getByStationId(stationId); // Assuming getByStationId accepts signal if needed
      // Check signal before setting state if passed
      if (signal && signal.aborted) return;
      setTransactions(stationTransactions);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(`Error loading transactions for station ${stationId}:`, error);
      }
    }
    // No need to check isMounted before setState if using the effect cleanup pattern correctly
  }, []); // Assuming transactionsApi is stable

  // 2. fetchStationData (depends on loadTransactions)
  const fetchStationData = useCallback(async (signal?: AbortSignal) => {
    if (!station.id) return;
    setIsLoading(true);
    try {
      const data = await stationsApi.getById(station.id); // Assuming getById accepts signal if needed
      if (signal && signal.aborted) return;
      setUpdatedStation(data);
      setError(null);
      // Call loadTransactions after station data is fetched
      loadTransactions(station.id, signal); // Pass signal down
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(`Error fetching station ${station.id}:`, error);
        setError('Failed to load station details');
      }
    } finally {
        // Only set loading false if not aborted
        if (!signal || !signal.aborted) {
             setIsLoading(false);
        }
    }
  }, [station.id, loadTransactions]); // Depends on stable station.id and loadTransactions

  // 3. WebSocket Handlers (depend on fetchStationData)
  const handleStationUpdate: WebSocketEventHandler = useCallback((data) => {
    console.log('Station update received in details:', data);
    if (data.chargePointId === station.id) {
      fetchStationData(); // Call the stable fetchStationData
    }
  }, [station.id, fetchStationData]);

  const handleConnectorUpdate: WebSocketEventHandler = useCallback((data) => {
    console.log('Connector update received in details:', data);
    if (data.chargePointId === station.id) {
      fetchStationData(); // Call the stable fetchStationData
    }
  }, [station.id, fetchStationData]);

  const handlePaymentUpdate: WebSocketEventHandler = useCallback((data) => {
    console.log('Payment update received in details:', data);
    if (data.chargePointId === station.id) {
      fetchStationData(); // Call the stable fetchStationData
      toast.success(`Payment completed for connector ${data.connectorId}`);
    }
  }, [station.id, fetchStationData]);


  // --- Effects ---

  // Main useEffect for setup and cleanup
  useEffect(() => {
    // AbortController to cancel async tasks on unmount
    const abortController = new AbortController();
    const signal = abortController.signal;

    let intervalId: NodeJS.Timeout | null = null;

    if (station.id && isOpen) { // Only run if modal is open and station id exists
      fetchStationData(signal);

      try {
        websocketService.connect();
        websocketService.subscribe(station.id);
        websocketService.on('station_update', handleStationUpdate);
        websocketService.on('connector_update', handleConnectorUpdate);
        websocketService.on('payment_update', handlePaymentUpdate);
      } catch (err) {
        console.error("Error setting up WebSocket in StationDetails:", err);
      }

      intervalId = setInterval(() => fetchStationData(signal), 10000);
    }

    // Cleanup function
    return () => {
      abortController.abort(); // Abort pending async operations
      if (intervalId) clearInterval(intervalId);
      try {
        // Use the stable handler references for cleanup
        websocketService.off('station_update', handleStationUpdate);
        websocketService.off('connector_update', handleConnectorUpdate);
        websocketService.off('payment_update', handlePaymentUpdate);
        if (station.id) {
          websocketService.unsubscribe(station.id);
        }
      } catch (err) {
        console.error("Error cleaning up WebSocket in StationDetails:", err);
      }
    };
    // Dependency array includes everything that could trigger a re-run
  }, [isOpen, station.id, fetchStationData, handleStationUpdate, handleConnectorUpdate, handlePaymentUpdate]);

  // Effect for polling transactions based on tab index
  useEffect(() => {
    let pollId: string | null = null;
    if (isOpen && tabIndex === 1 && station.id) {
      // Transactions tab - start polling transactions
      pollId = `transactions_${station.id}`;
      connectionManager.startPolling(pollId, () => loadTransactions(station.id)); // Pass station.id directly
    } 

    // Cleanup function for this effect
    return () => {
        if (pollId) {
             connectionManager.stopPolling(pollId);
        }
    }
  }, [tabIndex, station.id, isOpen, loadTransactions]); // Depend on tabIndex, isOpen, station.id, and loadTransactions

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
    connectionManager.startPolling(`station_${station.id}`, () => fetchStationData(new AbortController().signal));
    connectionManager.startPolling(`transactions_${station.id}`, () => loadTransactions(station.id, new AbortController().signal));
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
      fetchStationData(new AbortController().signal);
      loadTransactions(updatedStation.id, new AbortController().signal);

    } catch (error) {
      console.error(`Error stopping charging on connector ${connectorId}:`, error);
      toast.error(`Failed to stop charging. ${error.message || 'Please try again.'}`);
    }
  };

  const handleModalClose = () => {
    // Stop polling when modal closes (assuming connectionManager is stable)
    connectionManager.stopPolling(`station_${station.id}`);
    connectionManager.stopPolling(`transactions_${station.id}`);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleModalClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Station {updatedStation.id}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mb={4}>
              <HStack>
                <Text fontWeight="bold" minW="120px">Status:</Text>
                {getStatusBadge(updatedStation.status || 'Unknown')}
              </HStack>
              <HStack>
                <Text fontWeight="bold" minW="120px">Vendor:</Text>
                <Text>{updatedStation.vendor || 'N/A'}</Text>
              </HStack>
              <HStack>
                 <Text fontWeight="bold" minW="120px">Model:</Text>
                 <Text>{updatedStation.model || 'N/A'}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="bold" minW="120px">Firmware:</Text>
                <Text>{updatedStation.firmwareVersion || 'N/A'}</Text>
                {updatedStation.updateAvailable && (
                    <Badge colorScheme="purple" ml={2}>Update Available</Badge>
                )}
              </HStack>
               <HStack>
                 <Text fontWeight="bold" minW="120px">Last Heartbeat:</Text>
                 <Text>{formatDate(updatedStation.lastHeartbeat || '')}</Text>
               </HStack>
            </SimpleGrid>

            <Divider my={4} />

            <Heading size="sm" mb={3}>Connectors</Heading>
            <TableContainer>
              <Table size="sm" variant="striped">
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
                    <Tr key={connector.id || idx}>
                      <Td>{connector.id}</Td>
                      <Td>{connector.type || 'Unknown'}</Td>
                      <Td>
                        {formatPowerValue(connector.power)}
                      </Td>
                      <Td>{getStatusBadge(connector.status || 'Unknown')}</Td>
                      <Td>
                        {connector.meterValue && typeof connector.meterValue === 'object' ? (
                          <VStack align="start" spacing={0}>
                             <Text>
                              {connector.meterValue.value !== undefined && connector.meterValue.value !== null ?
                                (typeof connector.meterValue.value === 'number' ? 
                                    connector.meterValue.value.toFixed(2) :
                                    String(connector.meterValue.value)) 
                                : '0.00'}
                              {' '}{typeof connector.meterValue.unit === 'string' ? connector.meterValue.unit : 'Wh'}
                            </Text>
                            {connector.meterValue.timestamp && typeof connector.meterValue.timestamp === 'string' && (
                              <Text fontSize="xs" color="gray.500">
                                ({formatDate(connector.meterValue.timestamp)})
                              </Text>
                            )}
                          </VStack>
                        ) : (
                          <Text color="gray.500">No data</Text>
                        )}
                      </Td>
                      <Td>
                        <Flex minHeight="32px" alignItems="center">
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
                              variant="outline"
                            >
                              Pay Now
                            </Button>
                          )}
                          {connector.status === 'Charging' && (
                            <Button
                              size="sm"
                              colorScheme="red"
                              onClick={() => handleStopCharging(connector.id)}
                              variant="outline"
                            >
                              Stop
                            </Button>
                          )}
                          {connector.status === 'Faulted' && (
                            <Button
                              size="sm"
                              colorScheme="orange"
                              onClick={() => {
                                toast.info(`Reset command not implemented for connector ${connector.id}`);
                              }}
                              variant="outline"
                            >
                              Reset
                            </Button>
                          )}
                           {connector.status === 'Finishing' && (
                            <Button size="sm" isDisabled>
                              Completed
                            </Button>
                          )}
                          { !['Available', 'Preparing', 'Charging', 'Faulted', 'Finishing'].includes(connector.status || '') && (
                            <Button size="sm" isDisabled>
                              {connector.status || 'Unavailable'}
                            </Button>
                          )}
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </ModalBody>

          <ModalBody pt={0} pb={4}>
             <Tabs
              isFitted
              variant="enclosed"
              colorScheme="blue"
              index={tabIndex}
              onChange={setTabIndex}
              mt={4}
            >
              <TabList>
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
                      <TableContainer>
                        <Table size="sm" variant="striped">
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
                      </TableContainer>
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