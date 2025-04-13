import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Text,
  Stack,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  HStack,
  VStack,
  useBreakpointValue,
  useDisclosure,
  Spinner,
  OrderedList,
  ListItem
} from '@chakra-ui/react';
import { toast } from 'react-toastify';
import { SearchIcon, AddIcon } from '@chakra-ui/icons';
import { ChargingStation, Connector, connectionManager, stationsApi } from '../api/api';
import StationDetails from '../components/StationDetails';
import websocketService, { WebSocketEvent, WebSocketEventHandler } from '../api/websocket';

const Stations: React.FC = () => {
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [initialTabIndex, setInitialTabIndex] = useState(0);
  const { isOpen: isAddStationOpen, onOpen: onAddStationOpen, onClose: onAddStationClose } = useDisclosure();

  const isDesktop = useBreakpointValue({ base: false, md: true });

  // Define fetchStationsData at component level scope
  const fetchStationsData = async () => {
    setIsLoading(true);
    try {
      const data = await stationsApi.getAll();
      setStations(data);
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to fetch stations data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // Initial fetch
    fetchStationsData();

    // Connect WebSocket and set up event handlers
    try {
      websocketService.connect();
      
      const handleStationUpdate: WebSocketEventHandler = (data) => {
        console.log('Station update received:', data);
        fetchStationsData(); // Refresh data when updates come in
      };
      
      const handleConnectorUpdate: WebSocketEventHandler = (data) => {
        console.log('Connector update received:', data);
        fetchStationsData(); // Refresh data when updates come in
      };
      
      const handlePaymentUpdate: WebSocketEventHandler = (data) => {
        console.log('Payment update received:', data);
        fetchStationsData(); // Refresh data when updates come in
        toast.success(`Payment completed for station ${data.chargePointId}`);
      };
      
      // Register event handlers
      websocketService.on('station_update', handleStationUpdate);
      websocketService.on('connector_update', handleConnectorUpdate);
      websocketService.on('payment_update', handlePaymentUpdate);
      
      // Subscribe to all stations
      stations.forEach(station => {
        websocketService.subscribe(station.id);
      });
    } catch (err) {
      console.error("Error setting up WebSocket in Stations component:", err);
      // Will fall back to polling
    }

    // Still keep a polling interval as fallback, but at a longer interval
    intervalId = setInterval(fetchStationsData, 10000);

    // Clean up
    return () => {
      clearInterval(intervalId);
      
      try {
        // Clean up WebSocket handlers
        websocketService.off('station_update', handleStationUpdate);
        websocketService.off('connector_update', handleConnectorUpdate);
        websocketService.off('payment_update', handlePaymentUpdate);
        
        // Unsubscribe from all stations
        stations.forEach(station => {
          websocketService.unsubscribe(station.id);
        });
      } catch (err) {
        console.error("Error cleaning up WebSocket handlers:", err);
      }
    };
  }, []);

  // Add a useEffect to handle station subscription updates when stations change
  useEffect(() => {
    // Subscribe to all stations
    stations.forEach(station => {
      websocketService.subscribe(station.id);
    });
  }, [stations]);

  const formatHeartbeatTime = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    
    const heartbeatTime = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - heartbeatTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} min ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} hr ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
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
      case 'faulted':
        colorScheme = 'red';
        break;
      case 'unavailable':
        colorScheme = 'orange';
        break;
      case 'reserved':
        colorScheme = 'purple';
        break;
      default:
        colorScheme = 'gray';
    }
    
    return <Badge colorScheme={colorScheme}>{status}</Badge>;
  };

  const handleViewDetails = (station: ChargingStation) => {
    setSelectedStation(station);
    setInitialTabIndex(0); // Default to info tab
    setIsViewDetailsOpen(true);
  };

  const handleChargeButton = (station: ChargingStation) => {
    setSelectedStation(station);
    setInitialTabIndex(2); // Set to payment tab index
    setIsViewDetailsOpen(true);
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    fetchStationsData();
    
    // Trigger a quicker polling temporarily
    try {
      connectionManager.startPolling('stations', fetchStationsData);
    } catch (error) {
      console.error('Error setting up polling:', error);
    }
  };

  // Filter stations based on search term and status filter
  const filteredStations = stations.filter(station => {
    const matchesSearch = 
      station.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (station.vendor && station.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (station.model && station.model.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (station.status && station.status.toLowerCase() === statusFilter.toLowerCase());
    
    return matchesSearch && matchesStatus;
  });

  const hasPreparingConnectors = (station: ChargingStation): boolean => {
    if (!station.connectors || !Array.isArray(station.connectors)) return false;
    return station.connectors.some(c => c.status === 'Preparing');
  };

  const renderStationCards = () => {
    if (isLoading && stations.length === 0) {
      return (
        <Flex justify="center" py={10}>
          <Spinner size="xl" />
        </Flex>
      );
    }
    
    if (error) {
      return (
        <Box textAlign="center" p={6} color="red.500">
          <Text>{error}</Text>
          <Button mt={4} onClick={handleManualRefresh}>Try Again</Button>
        </Box>
      );
    }
    
    if (filteredStations.length === 0) {
      return (
        <Box textAlign="center" p={6}>
          <Text color="gray.500">No charging stations found</Text>
        </Box>
      );
    }
    
    return (
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
        {filteredStations.map(station => (
          <Card key={station.id || `station-${Math.random()}`} boxShadow="md" borderRadius="lg">
            <CardHeader pb={2}>
              <HStack justify="space-between" align="center">
                <Heading size="md">{station.id || 'Unknown'}</Heading>
                {station.status ? getStatusBadge(station.status) : getStatusBadge('Unknown')}
              </HStack>
              <Text fontSize="sm" color="gray.600" mt={1}>
                {station.vendor || 'Unknown'} {station.model || ''}
              </Text>
            </CardHeader>
            
            <CardBody pt={0}>
              <VStack align="stretch" spacing={3}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Connectors:
                  </Text>
                  {station.connectors && Array.isArray(station.connectors) && station.connectors.length > 0 ? (
                    station.connectors.map((connector, idx) => (
                      <HStack key={connector.id || idx} mb={2} spacing={3} p={2} borderWidth="1px" borderRadius="md">
                        <Badge>{connector.id}</Badge>
                        <Text fontSize="sm">{connector.type || 'Type 2'}</Text>
                        <Text fontSize="sm">{connector.power || 0} kW</Text>
                        <Badge colorScheme={
                          connector.status === 'Available' ? 'green' : 
                          connector.status === 'Charging' ? 'blue' : 
                          connector.status === 'Preparing' ? 'purple' : 
                          connector.status === 'Faulted' ? 'red' : 'gray'
                        }>
                          {connector.status || 'Unknown'}
                        </Badge>
                        {connector.meterValue && typeof connector.meterValue === 'object' && (
                          <Text fontSize="xs">
                            {connector.meterValue.value !== undefined && connector.meterValue.value !== null ? connector.meterValue.value : 0} 
                            {' '}{connector.meterValue.unit || 'Wh'}
                          </Text>
                        )}
                        {connector.status === 'Available' && (
                          <Text fontSize="xs" color="gray.500">
                            Plugged Out
                          </Text>
                        )}
                        {connector.status === 'Preparing' && (
                          <Button 
                            size="xs" 
                            colorScheme="green"
                            variant="outline"
                            onClick={() => handleChargeButton(station)}
                          >
                            Pay Now
                          </Button>
                        )}
                      </HStack>
                    ))
                  ) : (
                    <Text fontSize="sm" color="gray.500">No connectors available</Text>
                  )}
                </Box>
                
                <Text fontSize="sm">
                  Last seen: {station.lastHeartbeat ? formatHeartbeatTime(station.lastHeartbeat) : 'N/A'}
                </Text>
                
                <HStack pt={2} justify="flex-end" spacing={2}>
                  <Button 
                    size="sm" 
                    colorScheme="blue" 
                    variant="outline"
                    onClick={() => handleViewDetails(station)}
                  >
                    Details
                  </Button>
                  <Button 
                    size="sm" 
                    colorScheme="blue"
                    isDisabled={!hasPreparingConnectors(station)}
                    onClick={() => handleChargeButton(station)}
                  >
                    Pay Now
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    );
  };

  const renderStationTable = () => {
    if (isLoading && stations.length === 0) {
      return (
        <Flex justify="center" py={10}>
          <Spinner size="xl" />
        </Flex>
      );
    }
    
    if (error) {
      return (
        <Box textAlign="center" p={6} color="red.500">
          <Text>{error}</Text>
          <Button mt={4} onClick={handleManualRefresh}>Try Again</Button>
        </Box>
      );
    }
    
    if (filteredStations.length === 0) {
      return (
        <Box textAlign="center" p={6}>
          <Text color="gray.500">No charging stations found</Text>
        </Box>
      );
    }
    
    return (
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Vendor/Model</Th>
              <Th>Status</Th>
              <Th>Connectors</Th>
              <Th>Last Heartbeat</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredStations.map(station => {
              const stationId = station.id || `station-${Math.random().toString(36).substring(2)}`;
              return (
                <Tr key={stationId}>
                  <Td>{station.id || 'N/A'}</Td>
                  <Td>{(station.vendor || 'Unknown') + ' ' + (station.model || '')}</Td>
                  <Td>{station.status ? getStatusBadge(station.status) : getStatusBadge('Unknown')}</Td>
                  <Td>
                    <VStack align="start" spacing={1}>
                      {station.connectors && Array.isArray(station.connectors) && station.connectors.length > 0 ? 
                        station.connectors.map((connector, idx) => (
                          <HStack key={connector.id || idx} spacing={2} mb={2} p={1} borderWidth="1px" borderRadius="sm">
                            <Badge 
                              colorScheme={
                                connector.status === 'Available' ? 'green' : 
                                connector.status === 'Charging' ? 'blue' : 
                                connector.status === 'Preparing' ? 'purple' : 
                                connector.status === 'Faulted' ? 'red' : 'gray'
                              }
                            >
                              {connector.id}
                            </Badge>
                            <Text fontSize="xs">{connector.type}, {connector.power} kW</Text>
                            {connector.meterValue && typeof connector.meterValue === 'object' && (
                              <Text fontSize="xs">
                                {connector.meterValue.value !== undefined && connector.meterValue.value !== null ? connector.meterValue.value : 0} 
                                {' '}{connector.meterValue.unit || 'Wh'}
                              </Text>
                            )}
                            {connector.status === 'Available' && (
                              <Text fontSize="xs" color="gray.500">
                                Plugged Out
                              </Text>
                            )}
                            {connector.status === 'Preparing' && (
                              <Button 
                                size="xs" 
                                colorScheme="green"
                                variant="outline"
                                onClick={() => handleChargeButton(station)}
                              >
                                Pay Now
                              </Button>
                            )}
                          </HStack>
                        )) : 
                        <Text fontSize="xs">No connectors</Text>
                      }
                    </VStack>
                  </Td>
                  <Td>{station.lastHeartbeat ? formatHeartbeatTime(station.lastHeartbeat) : 'N/A'}</Td>
                  <Td>
                    <HStack spacing={2}>
                      <Button 
                        size="sm" 
                        colorScheme="blue" 
                        variant="outline"
                        onClick={() => handleViewDetails(station)}
                      >
                        Details
                      </Button>
                      <Button 
                        size="sm" 
                        colorScheme="blue"
                        isDisabled={!hasPreparingConnectors(station)}
                        onClick={() => handleChargeButton(station)}
                      >
                        Pay Now
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    );
  };

  return (
    <Box>
      <Flex 
        mb={6} 
        justifyContent="space-between" 
        alignItems="center"
        direction={{ base: 'column', md: 'row' }}
        gap={4}
      >
        <Heading size="lg">Charging Stations</Heading>
        <Button 
          leftIcon={<AddIcon />} 
          colorScheme="blue" 
          onClick={onAddStationOpen}
        >
          Add Station
        </Button>
      </Flex>
      
      <Box mb={6} p={4} bg="blue.50" borderRadius="md">
        <Heading size="sm" mb={2} color="blue.700">How to charge your vehicle:</Heading>
        <OrderedList spacing={1} pl={5} color="blue.700">
          <ListItem>Connect your vehicle to an available charging connector (status will change to "Preparing")</ListItem>
          <ListItem>When connector shows "Preparing" status, click "Pay Now" button</ListItem>
          <ListItem>Complete the payment process</ListItem>
          <ListItem>After payment, charging will begin automatically (status will change to "Charging")</ListItem>
        </OrderedList>
      </Box>
      
      <Stack 
        direction={{ base: 'column', md: 'row' }} 
        mb={6} 
        spacing={4}
      >
        <InputGroup maxW={{ base: '100%', md: '300px' }}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.300" />
          </InputLeftElement>
          <Input 
            placeholder="Search stations..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        
        <Select 
          maxW={{ base: '100%', md: '200px' }} 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="charging">Charging</option>
          <option value="faulted">Faulted</option>
          <option value="unavailable">Unavailable</option>
        </Select>
        
        <Button 
          colorScheme="blue" 
          variant="outline"
          onClick={handleManualRefresh}
          isLoading={isLoading}
        >
          Refresh
        </Button>
      </Stack>
      
      {isDesktop ? renderStationTable() : renderStationCards()}
      
      {/* Station Details Modal */}
      {isViewDetailsOpen && selectedStation && (
        <StationDetails
          station={selectedStation}
          isOpen={isViewDetailsOpen}
          onClose={() => setIsViewDetailsOpen(false)}
          initialTabIndex={initialTabIndex}
        />
      )}
      
      {/* Add Station Modal will be implemented later */}
    </Box>
  );
};

export default Stations;