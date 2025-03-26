import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Button,
  Grid,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stack,
  HStack,
  Flex,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  TableContainer,
  Skeleton,
  useColorModeValue,
  Divider
} from '@chakra-ui/react';
import { FiArrowLeft, FiZap, FiClock, FiBatteryCharging, FiWifi, FiAlertTriangle, FiLayers, FiCalendar, FiInfo } from 'react-icons/fi';
import { ChargingStation, Transaction, stationsApi } from '../api/api';

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Status badge colors
const statusColors = {
  Available: 'green',
  Charging: 'blue',
  Faulted: 'red',
  Unavailable: 'gray',
  Reserved: 'orange',
};

const StationDetail = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [station, setStation] = useState<ChargingStation | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStationData = async () => {
      if (!stationId) return;
      
      try {
        setLoading(true);
        
        // Attempt to fetch station and its transactions from API
        try {
          const stationsData = await stationsApi.getAll();
          const stationData = stationsData.find(s => s.id === stationId);
          if (stationData) {
            setStation(stationData);
          } else {
            throw new Error('Station not found');
          }
          
          const transactionsData = await stationsApi.getTransactions(stationId);
          setTransactions(transactionsData);
        } catch (error) {
          console.error('Error fetching station data:', error);
          
          // Fallback to mock data
          const mockStation: ChargingStation = {
            id: stationId,
            model: 'EVCharger Pro',
            vendor: 'ChargeTech',
            serialNumber: `SN-${Math.floor(Math.random() * 100000)}`,
            firmwareVersion: '2.3.1',
            connectors: [
              {
                id: 1,
                status: 'Available',
                availability: 'Operative',
                type: 'Type 2',
                power: 22
              },
              {
                id: 2,
                status: 'Charging',
                availability: 'Operative',
                type: 'CCS',
                power: 50
              }
            ],
            status: 'Charging',
            lastHeartbeat: new Date().toISOString(),
            networkStatus: 'Connected'
          };
          
          // Mock transactions
          const mockTransactions: Transaction[] = Array.from({ length: 5 }, (_, i) => {
            const isActive = i === 0;
            const startTime = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
            const endTime = isActive ? undefined : new Date(startTime.getTime() + (30 + i * 15) * 60 * 1000);
            const energyDelivered = isActive ? 2.5 : 5 + Math.random() * 25;
            
            return {
              id: `TX${String(i + 100).padStart(4, '0')}`,
              chargePointId: stationId,
              connectorId: Math.floor(Math.random() * 2) + 1,
              idTag: `RFID${Math.floor(10000 + Math.random() * 90000)}`,
              startTime: startTime.toISOString(),
              endTime: isActive ? undefined : endTime?.toISOString(),
              meterStart: Math.floor(Math.random() * 10000),
              meterStop: isActive ? undefined : Math.floor(Math.random() * 10000) + 10000,
              status: isActive ? 'InProgress' : 'Completed',
              energyDelivered,
              durationMinutes: isActive ? 15 : 30 + Math.floor(Math.random() * 60),
              cost: isActive ? undefined : energyDelivered * 0.35
            };
          });
          
          setStation(mockStation);
          setTransactions(mockTransactions);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStationData();
  }, [stationId]);

  if (loading) {
    return (
      <Box>
        <HStack mb={6} spacing={4}>
          <Button 
            leftIcon={<FiArrowLeft />} 
            variant="ghost" 
            onClick={() => navigate('/stations')}
          >
            Back
          </Button>
          <Skeleton height="36px" width="200px" />
        </HStack>
        <Grid templateColumns={{ base: '1fr', lg: '1fr 2fr' }} gap={6}>
          <Skeleton height="400px" />
          <Skeleton height="400px" />
        </Grid>
      </Box>
    );
  }

  if (!station) {
    return (
      <Box textAlign="center" py={10}>
        <Heading mb={4}>Station Not Found</Heading>
        <Text mb={6}>Could not find station with ID: {stationId}</Text>
        <Button 
          leftIcon={<FiArrowLeft />} 
          colorScheme="brand" 
          onClick={() => navigate('/stations')}
        >
          Back to Stations
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <HStack mb={6} spacing={4} wrap="wrap">
        <Button 
          leftIcon={<FiArrowLeft />} 
          variant="ghost" 
          onClick={() => navigate('/stations')}
        >
          Back
        </Button>
        <Heading size="lg">{station.id}</Heading>
        <Badge 
          colorScheme={statusColors[station.status as keyof typeof statusColors]}
          fontSize="md"
          borderRadius="full"
          px={3}
          py={1}
          ml={2}
        >
          {station.status}
        </Badge>
      </HStack>
      
      <Grid templateColumns={{ base: '1fr', lg: '1fr 2fr' }} gap={6}>
        {/* Left Column - Station Info */}
        <Box>
          <Card mb={6}>
            <CardHeader pb={2}>
              <Heading size="md">Station Information</Heading>
            </CardHeader>
            <CardBody pt={0}>
              <Stack spacing={4}>
                <Flex align="center">
                  <Icon as={FiInfo} color="gray.500" mr={3} />
                  <Text fontWeight="medium" width="120px">Model</Text>
                  <Text>{station.vendor} {station.model}</Text>
                </Flex>
                <Flex align="center">
                  <Icon as={FiLayers} color="gray.500" mr={3} />
                  <Text fontWeight="medium" width="120px">Serial</Text>
                  <Text>{station.serialNumber}</Text>
                </Flex>
                <Flex align="center">
                  <Icon as={FiCalendar} color="gray.500" mr={3} />
                  <Text fontWeight="medium" width="120px">Firmware</Text>
                  <Text>{station.firmwareVersion}</Text>
                </Flex>
                <Flex align="center">
                  <Icon as={FiWifi} color={station.networkStatus === 'Connected' ? 'green.500' : 'red.500'} mr={3} />
                  <Text fontWeight="medium" width="120px">Network</Text>
                  <Text>{station.networkStatus}</Text>
                </Flex>
                <Flex align="center">
                  <Icon as={FiClock} color="gray.500" mr={3} />
                  <Text fontWeight="medium" width="120px">Last Heartbeat</Text>
                  <Text>{formatDate(station.lastHeartbeat)}</Text>
                </Flex>
                {station.errorCode && (
                  <Flex align="center">
                    <Icon as={FiAlertTriangle} color="red.500" mr={3} />
                    <Text fontWeight="medium" width="120px">Error</Text>
                    <Text color="red.500">{station.errorCode}: {station.errorInfo}</Text>
                  </Flex>
                )}
              </Stack>
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader pb={2}>
              <Heading size="md">Connectors</Heading>
            </CardHeader>
            <CardBody pt={0}>
              <Stack spacing={4} divider={<Divider />}>
                {station.connectors.map(connector => (
                  <Box key={connector.id} p={2}>
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack>
                        <Icon 
                          as={connector.status === 'Charging' ? FiBatteryCharging : FiZap} 
                          color={connector.status === 'Charging' ? 'blue.500' : 'gray.500'} 
                          boxSize={5}
                        />
                        <Text fontWeight="semibold">Connector {connector.id}</Text>
                      </HStack>
                      <Badge 
                        colorScheme={connector.status === 'Available' ? 'green' : 'blue'}
                        borderRadius="full"
                        px={2}
                      >
                        {connector.status}
                      </Badge>
                    </Flex>
                    <Flex justify="space-between" fontSize="sm" color="gray.600">
                      <Text>{connector.type}</Text>
                      <Text>{connector.power} kW</Text>
                    </Flex>
                  </Box>
                ))}
              </Stack>
              
              <Button 
                mt={6} 
                colorScheme="brand" 
                width="full"
                variant="outline"
              >
                Remote Start Transaction
              </Button>
            </CardBody>
          </Card>
        </Box>
        
        {/* Right Column - Tabs */}
        <Card>
          <Tabs variant="enclosed">
            <TabList>
              <Tab>Transactions</Tab>
              <Tab>Statistics</Tab>
              <Tab>Commands</Tab>
            </TabList>
            <TabPanels>
              {/* Transactions Tab */}
              <TabPanel>
                <Heading size="sm" mb={4}>Recent Transactions</Heading>
                {transactions.length === 0 ? (
                  <Text color="gray.500">No transactions found for this station.</Text>
                ) : (
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>ID</Th>
                          <Th>Connector</Th>
                          <Th>Started</Th>
                          <Th>Status</Th>
                          <Th>Energy</Th>
                          <Th>Duration</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {transactions.map(tx => (
                          <Tr key={tx.id} _hover={{ bg: 'gray.50' }}>
                            <Td fontWeight="medium">{tx.id}</Td>
                            <Td>{tx.connectorId}</Td>
                            <Td>{formatDate(tx.startTime)}</Td>
                            <Td>
                              <Badge 
                                colorScheme={tx.status === 'InProgress' ? 'blue' : 'green'}
                                borderRadius="full"
                              >
                                {tx.status === 'InProgress' ? 'Active' : 'Completed'}
                              </Badge>
                            </Td>
                            <Td>
                              <Flex align="center">
                                <Icon 
                                  as={tx.status === 'InProgress' ? FiBatteryCharging : FiZap}
                                  color={tx.status === 'InProgress' ? 'blue.500' : 'green.500'}
                                  mr={1}
                                />
                                {tx.energyDelivered.toFixed(1)} kWh
                              </Flex>
                            </Td>
                            <Td>{tx.durationMinutes} min</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                )}
              </TabPanel>
              
              {/* Statistics Tab */}
              <TabPanel>
                <Heading size="sm" mb={4}>Station Statistics</Heading>
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                  <Card variant="outline">
                    <CardBody>
                      <Flex direction="column" align="center" justify="center" textAlign="center">
                        <Text color="gray.500">Total Energy Delivered</Text>
                        <HStack mt={2}>
                          <Icon as={FiZap} color="brand.500" boxSize={5} />
                          <Text fontSize="2xl" fontWeight="bold">
                            {transactions
                              .reduce((sum, tx) => sum + tx.energyDelivered, 0)
                              .toFixed(1)} kWh
                          </Text>
                        </HStack>
                      </Flex>
                    </CardBody>
                  </Card>
                  
                  <Card variant="outline">
                    <CardBody>
                      <Flex direction="column" align="center" justify="center" textAlign="center">
                        <Text color="gray.500">Total Sessions</Text>
                        <HStack mt={2}>
                          <Icon as={FiCalendar} color="purple.500" boxSize={5} />
                          <Text fontSize="2xl" fontWeight="bold">
                            {transactions.length}
                          </Text>
                        </HStack>
                      </Flex>
                    </CardBody>
                  </Card>
                </Grid>
              </TabPanel>
              
              {/* Commands Tab */}
              <TabPanel>
                <Heading size="sm" mb={4}>Remote Commands</Heading>
                <Text mb={6}>Send commands to control this charging station remotely.</Text>
                
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                  <Button colorScheme="brand" leftIcon={<FiZap />}>
                    Remote Start Transaction
                  </Button>
                  <Button colorScheme="red" variant="outline">
                    Remote Stop Transaction
                  </Button>
                  <Button colorScheme="gray">
                    Reset
                  </Button>
                  <Button colorScheme="blue" variant="outline">
                    Unlock Connector
                  </Button>
                </Grid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Card>
      </Grid>
    </Box>
  );
};

export default StationDetail;