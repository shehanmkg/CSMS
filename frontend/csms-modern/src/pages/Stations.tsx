import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  useToast,
  Spinner,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  VStack,
  HStack,
  useBreakpointValue
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, InfoOutlineIcon, EditIcon } from '@chakra-ui/icons';
import { stationsApi, ChargingStation } from '../api/api';

const Stations: React.FC = () => {
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  // Use breakpoint to determine display mode
  const displayMode = useBreakpointValue<'table' | 'cards'>({ 
    base: 'cards', 
    md: 'table' 
  }) || 'cards';

  // Fetch stations on component mount
  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoading(true);
        const data = await stationsApi.getAll();
        setStations(data);
      } catch (error) {
        console.error('Error fetching stations:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch charging stations. Please try again later.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, [toast]);

  // Filter stations based on search term and status filter
  const filteredStations = stations.filter(station => {
    const matchesSearch = searchTerm === '' || 
                         station.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         station.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         station.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || station.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Format last heartbeat time
  const formatHeartbeat = (heartbeatTime: string) => {
    const date = new Date(heartbeatTime);
    return date.toLocaleTimeString();
  };

  // Status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return <Badge colorScheme="green">Available</Badge>;
      case 'Charging':
        return <Badge colorScheme="blue">Charging</Badge>;
      case 'Faulted':
        return <Badge colorScheme="red">Faulted</Badge>;
      case 'Unavailable':
        return <Badge colorScheme="orange">Unavailable</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get connector power
  const getConnectorPower = (station: ChargingStation) => {
    if (station.connectors && station.connectors.length > 0) {
      const powers = station.connectors.map(c => `${c.power}kW`);
      return powers.join(', ');
    }
    return '—';
  };

  // Table view for stations
  const renderStationsTable = () => (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Vendor/Model</Th>
            <Th>Status</Th>
            <Th>Last Heartbeat</Th>
            <Th>Power</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredStations.map((station) => (
            <Tr key={station.id}>
              <Td>{station.id}</Td>
              <Td>{station.vendor} {station.model}</Td>
              <Td>{getStatusBadge(station.status)}</Td>
              <Td>{formatHeartbeat(station.lastHeartbeat)}</Td>
              <Td>{getConnectorPower(station)}</Td>
              <Td>
                <Button size="sm" colorScheme="blue" mr={2} leftIcon={<InfoOutlineIcon />}>
                  View
                </Button>
                <Button size="sm" colorScheme="teal" leftIcon={<EditIcon />}>
                  Edit
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );

  // Card view for stations (mobile)
  const renderStationsCards = () => (
    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
      {filteredStations.map((station) => (
        <Card key={station.id} shadow="md">
          <CardHeader pb={2}>
            <Flex justifyContent="space-between" alignItems="flex-start">
              <Heading size="md">{station.id}</Heading>
              {getStatusBadge(station.status)}
            </Flex>
            <Text color="gray.600" fontSize="sm">{station.vendor} {station.model}</Text>
          </CardHeader>
          <CardBody pt={2}>
            <VStack align="stretch" spacing={1}>
              <Flex justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Last Heartbeat:</Text>
                <Text fontSize="sm">{formatHeartbeat(station.lastHeartbeat)}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Power:</Text>
                <Text fontSize="sm">{getConnectorPower(station)}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Connectors:</Text>
                <Text fontSize="sm">{station.connectors.length}</Text>
              </Flex>
              <HStack spacing={2} mt={3} justify="flex-end">
                <Button size="sm" colorScheme="blue" leftIcon={<InfoOutlineIcon />}>
                  View
                </Button>
                <Button size="sm" colorScheme="teal" leftIcon={<EditIcon />}>
                  Edit
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      ))}
    </SimpleGrid>
  );

  if (loading) {
    return (
      <Flex p={5} height="200px" justify="center" align="center" direction="column">
        <Spinner size="xl" color="brand.500" thickness="4px" />
        <Text mt={4} fontSize="lg">Loading charging stations...</Text>
      </Flex>
    );
  }

  return (
    <Box width="100%">
      <Flex 
        justifyContent="space-between" 
        alignItems="center" 
        mb={{ base: 4, md: 6 }}
        flexDirection={{ base: 'column', sm: 'row' }}
        gap={{ base: 2, sm: 0 }}
      >
        <Heading size={{ base: "lg", md: "xl" }}>Charging Stations</Heading>
        <Button 
          leftIcon={<AddIcon />} 
          colorScheme="brand" 
          onClick={onOpen}
          width={{ base: 'full', sm: 'auto' }}
        >
          Add Station
        </Button>
      </Flex>

      <Flex 
        mb={{ base: 4, md: 6 }} 
        gap={4} 
        flexWrap={{ base: 'wrap', md: 'nowrap' }}
        direction={{ base: 'column', md: 'row' }}
      >
        <InputGroup>
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
          width={{ base: 'full', md: '200px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="Available">Available</option>
          <option value="Charging">Charging</option>
          <option value="Faulted">Faulted</option>
          <option value="Unavailable">Unavailable</option>
        </Select>
      </Flex>

      {filteredStations.length === 0 ? (
        <Text textAlign="center" p={6} bg="gray.50" borderRadius="md">
          No stations match your search criteria.
        </Text>
      ) : displayMode === 'table' ? renderStationsTable() : renderStationsCards()}

      {/* Add Station Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'md' }}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Charging Station</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Station ID</FormLabel>
              <Input placeholder="Enter station ID" />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Vendor</FormLabel>
              <Input placeholder="Enter vendor name" />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Model</FormLabel>
              <Input placeholder="Enter model name" />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Number of Connectors</FormLabel>
              <Select>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="4">4</option>
              </Select>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="gray" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="brand">
              Add Station
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Stations; 