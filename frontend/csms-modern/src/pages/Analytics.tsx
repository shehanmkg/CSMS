import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Text,
  Flex,
  Select,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Spinner,
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stack,
  VStack,
  HStack,
  useColorModeValue,
  useBreakpointValue
} from '@chakra-ui/react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarIcon, DownloadIcon, RepeatIcon } from '@chakra-ui/icons';

// Sample analytics data (in real app, this would come from your API)
const energyUsageData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 }
];

const stationUsageData = [
  { name: 'Station 1', value: 35 },
  { name: 'Station 2', value: 25 },
  { name: 'Station 3', value: 15 },
  { name: 'Station 4', value: 10 },
  { name: 'Station 5', value: 15 }
];

const revenueTrendsData = [
  { name: 'Week 1', revenue: 4000 },
  { name: 'Week 2', revenue: 4500 },
  { name: 'Week 3', revenue: 5100 },
  { name: 'Week 4', revenue: 4800 }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Analytics: React.FC = () => {
  const [timeFrame, setTimeFrame] = useState('month');
  const [loading, setLoading] = useState(true);
  
  // Determine chart height based on screen size
  const chartHeight = useBreakpointValue({ base: 200, sm: 250, md: 300 });
  
  // Set card background color based on color mode
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    // In a real application, this would fetch fresh data
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <Flex p={5} height="300px" justify="center" align="center" direction="column">
        <Spinner size="xl" color="brand.500" thickness="4px" />
        <Text mt={4} fontSize="lg">Loading analytics data...</Text>
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
        gap={{ base: 3, sm: 0 }}
      >
        <Heading size={{ base: "lg", md: "xl" }}>Analytics Dashboard</Heading>
        <HStack spacing={3}>
          <Select 
            size={{ base: "md", md: "md" }}
            value={timeFrame} 
            onChange={(e) => setTimeFrame(e.target.value)}
            width={{ base: "full", sm: "130px" }}
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </Select>
          <Button 
            leftIcon={<RepeatIcon />} 
            colorScheme="brand" 
            variant="outline"
            onClick={handleRefresh}
            size={{ base: "md", md: "md" }}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Key Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4} mb={6}>
        <Stat
          px={{ base: 4, md: 6 }}
          py="5"
          shadow="sm"
          border="1px"
          borderColor={borderColor}
          rounded="lg"
          bg={cardBg}
        >
          <StatLabel fontWeight="medium">Total Energy</StatLabel>
          <StatNumber fontSize={{ base: "2xl", md: "3xl" }}>14,500 kWh</StatNumber>
          <StatHelpText>
            <StatArrow type="increase" />
            12.3%
          </StatHelpText>
        </Stat>
        <Stat
          px={{ base: 4, md: 6 }}
          py="5"
          shadow="sm"
          border="1px"
          borderColor={borderColor}
          rounded="lg"
          bg={cardBg}
        >
          <StatLabel fontWeight="medium">Revenue</StatLabel>
          <StatNumber fontSize={{ base: "2xl", md: "3xl" }}>$12,430</StatNumber>
          <StatHelpText>
            <StatArrow type="increase" />
            8.2%
          </StatHelpText>
        </Stat>
        <Stat
          px={{ base: 4, md: 6 }}
          py="5"
          shadow="sm"
          border="1px"
          borderColor={borderColor}
          rounded="lg"
          bg={cardBg}
        >
          <StatLabel fontWeight="medium">Charging Sessions</StatLabel>
          <StatNumber fontSize={{ base: "2xl", md: "3xl" }}>842</StatNumber>
          <StatHelpText>
            <StatArrow type="increase" />
            5.5%
          </StatHelpText>
        </Stat>
        <Stat
          px={{ base: 4, md: 6 }}
          py="5"
          shadow="sm"
          border="1px"
          borderColor={borderColor}
          rounded="lg"
          bg={cardBg}
        >
          <StatLabel fontWeight="medium">Avg. Session</StatLabel>
          <StatNumber fontSize={{ base: "2xl", md: "3xl" }}>37 min</StatNumber>
          <StatHelpText>
            <StatArrow type="decrease" />
            1.2%
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        {/* Energy Usage Chart */}
        <Card shadow="sm" bg={cardBg} border="1px" borderColor={borderColor}>
          <CardHeader pb={0}>
            <Flex justifyContent="space-between" alignItems="center">
              <Text fontWeight="medium" fontSize="lg">Energy Usage Trend</Text>
              <Button size="sm" variant="ghost" leftIcon={<DownloadIcon />}>
                Export
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height={chartHeight} width="100%">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={energyUsageData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Energy (kWh)" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        {/* Revenue Trends Chart */}
        <Card shadow="sm" bg={cardBg} border="1px" borderColor={borderColor}>
          <CardHeader pb={0}>
            <Flex justifyContent="space-between" alignItems="center">
              <Text fontWeight="medium" fontSize="lg">Revenue Trends</Text>
              <Button size="sm" variant="ghost" leftIcon={<DownloadIcon />}>
                Export
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height={chartHeight} width="100%">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueTrendsData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#0088FE" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Additional charts/data */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        {/* Station Usage Chart */}
        <Card shadow="sm" bg={cardBg} border="1px" borderColor={borderColor}>
          <CardHeader pb={0}>
            <Flex justifyContent="space-between" alignItems="center">
              <Text fontWeight="medium" fontSize="lg">Station Usage</Text>
              <Button size="sm" variant="ghost" leftIcon={<DownloadIcon />}>
                Export
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height={chartHeight} width="100%">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stationUsageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stationUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        {/* Peak Hours Chart */}
        <Card shadow="sm" bg={cardBg} border="1px" borderColor={borderColor}>
          <CardHeader pb={0}>
            <Flex justifyContent="space-between" alignItems="center">
              <Text fontWeight="medium" fontSize="lg">Peak Charging Hours</Text>
              <Button size="sm" variant="ghost" leftIcon={<DownloadIcon />}>
                Export
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height={chartHeight} width="100%">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { hour: '6 AM', sessions: 12 },
                    { hour: '9 AM', sessions: 45 },
                    { hour: '12 PM', sessions: 38 },
                    { hour: '3 PM', sessions: 25 },
                    { hour: '6 PM', sessions: 58 },
                    { hour: '9 PM', sessions: 30 }
                  ]}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sessions" name="Charging Sessions" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Flex justifyContent="flex-end" mt={4}>
        <ButtonGroup size="sm" variant="outline">
          <Button leftIcon={<CalendarIcon />}>Schedule Reports</Button>
          <Button leftIcon={<DownloadIcon />}>Download Full Report</Button>
        </ButtonGroup>
      </Flex>
    </Box>
  );
};

export default Analytics; 