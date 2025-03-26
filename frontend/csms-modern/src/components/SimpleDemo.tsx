import React from 'react';
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';

const SimpleDemo = () => {
  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
      <Heading size="md" mb={4}>Chakra UI Test Component</Heading>
      <Text mb={4}>
        Testing if Chakra UI v3 components work correctly in our application.
      </Text>
      <Flex gap={4}>
        <Button colorScheme="blue">Primary Button</Button>
        <Button variant="outline" colorScheme="blue">Outline Button</Button>
      </Flex>
    </Box>
  );
};

export default SimpleDemo; 