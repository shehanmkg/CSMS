import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Text,
  Spinner,
  useToast,
  Divider,
  Flex
} from '@chakra-ui/react';
import { dashboardApi, DashboardStats, stationsApi, transactionsApi } from '../api/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stationStatus, setStationStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard statistics
        const dashboardStats = await dashboardApi.getStats();
        setStats(dashboardStats);
        
        // Fetch stations to get status distribution
        const stations = await stationsApi.getAll();
        
        // Count stations by status
        const statusCount: Record<string, number> = {};
        stations.forEach(station => {
          statusCount[station.status] = (statusCount[station.status] || 0) + 1;
        });
        setStationStatus(statusCount);
        
        // Fetch recent transactions to show as activity
        const transactions = await transactionsApi.getAll();
        
        // Sort transactions by start time, newest first, and take the 5 most recent
        const sortedTransactions = [...transactions]
          .sort((a, b) => new Date(b.startTimestamp).getTime() - new Date(a.startTimestamp).getTime())
          .slice(0, 5);
        
        // Transform transactions into activity items
        const activityItems = sortedTransactions.map(tx => {
          const isActive = !tx.stopTimestamp;
          return {
            id: tx.transactionId,
            stationId: tx.chargePointId,
            time: new Date(isActive ? tx.startTimestamp : tx.stopTimestamp || '').toLocaleTimeString(),
            event: isActive ? 'started charging' : 'completed charging'
          };
        });
        
        setRecentActivity(activityItems);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data. Please try again later.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  if (loading) {
    return (
      <Flex p={5} height="200px" justify="center" align="center" direction="column">
        <Spinner size="xl" color="brand.500" thickness="4px" />
        <Text mt={4} fontSize="lg">Loading dashboard data...</Text>
      </Flex>
    );
  }

  return (
    <Box width="100%">
      <Heading mb={{ base: 4, md: 6 }} size={{ base: "lg", md: "xl" }}>Dashboard</Heading>
      
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 4, md: 6 }} mb={{ base: 6, md: 8 }}>
        <Stat p={{ base: 3, md: 5 }} shadow="md" border="1px" borderColor="gray.200" borderRadius="md" bg="white">
          <StatLabel fontSize={{ base: "sm", md: "md" }}>Active Stations</StatLabel>
          <StatNumber fontSize={{ base: "2xl", md: "3xl" }} color="brand.600">{stats?.activeStations || 0}</StatNumber>
          <StatHelpText>Out of {stats?.totalStations || 0} total</StatHelpText>
        </Stat>
        
        <Stat p={{ base: 3, md: 5 }} shadow="md" border="1px" borderColor="gray.200" borderRadius="md" bg="white">
          <StatLabel fontSize={{ base: "sm", md: "md" }}>Current Sessions</StatLabel>
          <StatNumber fontSize={{ base: "2xl", md: "3xl" }} color="blue.500">{stats?.activeTransactions || 0}</StatNumber>
          <StatHelpText>Active charging sessions</StatHelpText>
        </Stat>
        
        <Stat p={{ base: 3, md: 5 }} shadow="md" border="1px" borderColor="gray.200" borderRadius="md" bg="white">
          <StatLabel fontSize={{ base: "sm", md: "md" }}>Energy Delivered</StatLabel>
          <StatNumber fontSize={{ base: "2xl", md: "3xl" }} color="green.500">{stats ? (stats.totalEnergyDelivered / 1000).toFixed(1) : 0} kWh</StatNumber>
          <StatHelpText>Total</StatHelpText>
        </Stat>
      </SimpleGrid>
      
      <Grid 
        templateColumns={{ base: "1fr", lg: "2fr 1fr" }} 
        gap={{ base: 4, md: 6 }}
        mb={{ base: 4, md: 0 }}
      >
        <GridItem>
          <Card shadow="md" height="100%">
            <CardHeader pb={0}>
              <Heading size="md">Recent Activity</Heading>
            </CardHeader>
            <Divider my={2} />
            <CardBody pt={2}>
              {recentActivity.length === 0 ? (
                <Text>No recent activity</Text>
              ) : (
                recentActivity.map((activity, index) => (
                  <Box key={activity.id} py={2} borderBottom={index < recentActivity.length - 1 ? "1px solid" : "none"} borderColor="gray.100">
                    <Flex justify="space-between" align="center">
                      <Text fontWeight="medium">
                        <Text as="span" color="brand.500">{activity.stationId}</Text> {activity.event}
                      </Text>
                      <Text fontSize="sm" color="gray.500">{activity.time}</Text>
                    </Flex>
                  </Box>
                ))
              )}
            </CardBody>
          </Card>
        </GridItem>
        
        <GridItem>
          <Card shadow="md" height="100%">
            <CardHeader pb={0}>
              <Heading size="md">Station Status</Heading>
            </CardHeader>
            <Divider my={2} />
            <CardBody pt={2}>
              <SimpleGrid columns={{ base: 2, md: 1 }} spacing={3}>
                <Flex justify="space-between" align="center">
                  <Text color="green.500" fontWeight="bold">Available</Text>
                  <Text>{stationStatus['Available'] || 0}</Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text color="blue.500" fontWeight="bold">Charging</Text>
                  <Text>{stationStatus['Charging'] || 0}</Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text color="red.500" fontWeight="bold">Faulted</Text>
                  <Text>{stationStatus['Faulted'] || 0}</Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text color="orange.500" fontWeight="bold">Unavailable</Text>
                  <Text>{stationStatus['Unavailable'] || 0}</Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text color="gray.500" fontWeight="bold">Other</Text>
                  <Text>{Object.keys(stationStatus)
                    .filter(key => !['Available', 'Charging', 'Faulted', 'Unavailable'].includes(key))
                    .reduce((sum, key) => sum + stationStatus[key], 0)}</Text>
                </Flex>
              </SimpleGrid>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default Dashboard; 