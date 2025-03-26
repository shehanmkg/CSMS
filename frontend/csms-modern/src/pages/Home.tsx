import React from 'react';
import { Box, Button, Container, Heading, Stack, Text, Image, Flex } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box minH="100vh" bg="gray.50" py={10}>
      <Container maxW="container.xl">
        <Stack spacing={8} align="center" textAlign="center">
          <Heading as="h1" size="2xl" fontWeight="bold" color="brand.600">
            EV Charging Station Management System
          </Heading>
          
          <Text fontSize="xl" maxW="800px">
            A comprehensive platform for monitoring and managing your EV charging infrastructure
          </Text>
          
          <Box 
            p={8} 
            shadow="xl" 
            borderRadius="xl" 
            bg="white" 
            w="full"
            maxW="1000px"
          >
            <Stack spacing={8}>
              <Flex direction={{ base: 'column', md: 'row' }} gap={8}>
                <Box flex="1">
                  <Heading as="h2" size="lg" mb={4}>Efficient Management</Heading>
                  <Text>
                    Monitor your charging stations in real-time. Track status, performance, 
                    and maintenance needs from a centralized dashboard.
                  </Text>
                </Box>
                <Box flex="1">
                  <Heading as="h2" size="lg" mb={4}>Comprehensive Analytics</Heading>
                  <Text>
                    Gain insights into usage patterns, energy consumption, 
                    and performance metrics to optimize your operations.
                  </Text>
                </Box>
              </Flex>
              
              <Button 
                size="lg" 
                colorScheme="brand" 
                onClick={() => navigate('/dashboard')}
                minW="200px"
                alignSelf="center"
              >
                Get Started
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default Home; 