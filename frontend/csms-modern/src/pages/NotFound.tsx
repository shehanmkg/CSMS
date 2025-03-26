import { Box, Heading, Text, Button, Flex, Icon } from '@chakra-ui/react';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Flex 
      direction="column" 
      align="center" 
      justify="center" 
      minH="70vh" 
      py={10} 
      px={6}
      textAlign="center"
    >
      <Icon as={FiAlertTriangle} boxSize={16} color="brand.500" mb={6} />
      <Heading mb={6} size="xl">404 - Page Not Found</Heading>
      <Text fontSize="xl" mb={8} maxW="lg">
        The page you're looking for doesn't exist or has been moved.
      </Text>
      <Button 
        leftIcon={<FiArrowLeft />} 
        colorScheme="brand" 
        size="lg"
        onClick={() => navigate('/')}
      >
        Back to Dashboard
      </Button>
    </Flex>
  );
};

export default NotFound; 