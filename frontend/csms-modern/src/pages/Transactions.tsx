import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Select,
  Spinner,
  Text,
  useToast,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  VStack,
  HStack,
  Button,
  useBreakpointValue,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Popover,
  Tag,
  Tooltip
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon, InfoOutlineIcon, DownloadIcon } from '@chakra-ui/icons';
import { transactionsApi, Transaction } from '../api/api';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const toast = useToast();
  
  // Use breakpoint to determine display mode
  const displayMode = useBreakpointValue<'table' | 'cards'>({ 
    base: 'cards', 
    md: 'table' 
  }) || 'cards';

  // Fetch transactions on component mount
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await transactionsApi.getAll();
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch transaction data. Please try again later.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [toast]);

  // Filter transactions based on search term and status filter
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
                         transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.stationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.userId && transaction.userId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Format date and time
  const formatDateTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  // Format duration
  const formatDuration = (startTime: string, endTime: string) => {
    if (!endTime) return '—';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Format energy in kWh
  const formatEnergy = (energy: number) => {
    return `${energy.toFixed(2)} kWh`;
  };

  // Format cost
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`;
  };

  // Status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge colorScheme="green">Completed</Badge>;
      case 'In Progress':
        return <Badge colorScheme="blue">In Progress</Badge>;
      case 'Failed':
        return <Badge colorScheme="red">Failed</Badge>;
      case 'Authorized':
        return <Badge colorScheme="yellow">Authorized</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Table view for transactions
  const renderTransactionsTable = () => (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Station</Th>
            <Th>Start Time</Th>
            <Th>Duration</Th>
            <Th>Energy</Th>
            <Th>Cost</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredTransactions.map((transaction) => (
            <Tr key={transaction.id}>
              <Td>{transaction.id}</Td>
              <Td>{transaction.stationId}</Td>
              <Td>{formatDateTime(transaction.startTime)}</Td>
              <Td>{formatDuration(transaction.startTime, transaction.endTime)}</Td>
              <Td>{formatEnergy(transaction.energy)}</Td>
              <Td>{formatCost(transaction.cost)}</Td>
              <Td>{getStatusBadge(transaction.status)}</Td>
              <Td>
                <Tooltip label="View details">
                  <IconButton
                    aria-label="View transaction details"
                    icon={<InfoOutlineIcon />}
                    size="sm"
                    colorScheme="blue"
                    mr={2}
                  />
                </Tooltip>
                <Tooltip label="Download invoice">
                  <IconButton
                    aria-label="Download invoice"
                    icon={<DownloadIcon />}
                    size="sm"
                    colorScheme="teal"
                  />
                </Tooltip>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );

  // Card view for transactions (mobile)
  const renderTransactionsCards = () => (
    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
      {filteredTransactions.map((transaction) => (
        <Card key={transaction.id} shadow="md">
          <CardHeader pb={1}>
            <Flex justifyContent="space-between" alignItems="flex-start">
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold" fontSize="md">Transaction #{transaction.id.substring(0, 8)}</Text>
                <Text color="gray.600" fontSize="sm">Station: {transaction.stationId}</Text>
              </VStack>
              {getStatusBadge(transaction.status)}
            </Flex>
          </CardHeader>
          <CardBody pt={2}>
            <VStack align="stretch" spacing={1}>
              <Flex justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Start Time:</Text>
                <Text fontSize="sm">{formatDateTime(transaction.startTime)}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Duration:</Text>
                <Text fontSize="sm">{formatDuration(transaction.startTime, transaction.endTime)}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Energy:</Text>
                <Text fontSize="sm">{formatEnergy(transaction.energy)}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Cost:</Text>
                <Text fontSize="sm" fontWeight="bold">{formatCost(transaction.cost)}</Text>
              </Flex>
              {transaction.userId && (
                <Flex justify="space-between">
                  <Text fontSize="sm" fontWeight="medium">User:</Text>
                  <Text fontSize="sm">{transaction.userId}</Text>
                </Flex>
              )}
              <HStack spacing={2} mt={3} justify="flex-end">
                <IconButton
                  aria-label="View transaction details"
                  icon={<InfoOutlineIcon />}
                  size="sm"
                  colorScheme="blue"
                />
                <IconButton
                  aria-label="Download invoice"
                  icon={<DownloadIcon />}
                  size="sm"
                  colorScheme="teal"
                />
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
        <Text mt={4} fontSize="lg">Loading transactions...</Text>
      </Flex>
    );
  }

  return (
    <Box width="100%">
      <Heading size={{ base: "lg", md: "xl" }} mb={{ base: 4, md: 6 }}>
        Charging Transactions
      </Heading>

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
            placeholder="Search by ID, station, or user..." 
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
          <option value="Completed">Completed</option>
          <option value="In Progress">In Progress</option>
          <option value="Failed">Failed</option>
          <option value="Authorized">Authorized</option>
        </Select>

        <Menu>
          <MenuButton 
            as={Button} 
            rightIcon={<ChevronDownIcon />}
            width={{ base: 'full', md: 'auto' }}
          >
            Export
          </MenuButton>
          <MenuList>
            <MenuItem>Export as CSV</MenuItem>
            <MenuItem>Export as PDF</MenuItem>
            <MenuItem>Export as Excel</MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {filteredTransactions.length === 0 ? (
        <Text textAlign="center" p={6} bg="gray.50" borderRadius="md">
          No transactions match your search criteria.
        </Text>
      ) : displayMode === 'table' ? renderTransactionsTable() : renderTransactionsCards()}
    </Box>
  );
};

export default Transactions; 