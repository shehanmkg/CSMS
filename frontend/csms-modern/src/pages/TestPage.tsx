import React, { useState, useEffect } from 'react';
import { Box, Heading, Text, VStack, Button, Alert, AlertIcon, Code, Flex, Divider } from '@chakra-ui/react';

const TestPage: React.FC = () => {
  // Sample meterValue with the same structure as in our app
  const [state, setState] = useState({
    normalMeterValue: {
      value: 42,
      unit: 'Wh',
      timestamp: new Date().toISOString()
    },
    nullValue: {
      value: null,
      unit: 'Wh'
    },
    undefinedValue: {
      value: undefined,
      unit: 'Wh'
    },
    zeroValue: {
      value: 0,
      unit: 'Wh'
    },
    stringValue: {
      value: "42",
      unit: 'Wh'
    },
    noUnit: {
      value: 42
    },
    emptyObject: {},
    nullMeterValue: null,
    undefinedMeterValue: undefined,
    hasError: false,
    errorMessage: ''
  });
  
  // Toggle error rendering to test error boundary
  const toggleErrorRendering = () => {
    setState(prev => ({ ...prev, hasError: !prev.hasError }));
  };
  
  return (
    <Box p={5}>
      <Heading mb={5}>Test Page: Debugging MeterValue Rendering</Heading>
      
      <Box mb={4}>
        <Button colorScheme="red" onClick={toggleErrorRendering}>
          {state.hasError ? "Hide Error Example" : "Show Error Example"}
        </Button>
      </Box>
      
      {state.hasError && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          The example below will cause a React error. Check console for details.
        </Alert>
      )}
      
      <VStack align="start" spacing={6} divider={<Divider />}>
        <Box width="100%">
          <Heading size="md" mb={2}>Normal MeterValue Object:</Heading>
          <Code p={2} display="block" mb={2}>
            {`{value: 42, unit: 'Wh', timestamp: '${state.normalMeterValue.timestamp}'}`}
          </Code>
          <Text fontWeight="bold">Safe Rendering:</Text>
          <Box borderWidth="1px" p={2} borderRadius="md">
            Value: {state.normalMeterValue.value !== undefined ? state.normalMeterValue.value : 0} {state.normalMeterValue.unit || 'Wh'}
            {state.normalMeterValue.timestamp && <Text fontSize="xs" color="gray.500"> ({state.normalMeterValue.timestamp})</Text>}
          </Box>
          
          {state.hasError && (
            <Box mt={2}>
              <Text fontWeight="bold" color="red.500">Unsafe (Error):</Text>
              <Box borderWidth="1px" p={2} borderRadius="md" borderColor="red.300">
                {/* This will cause the React error */}
                {state.normalMeterValue}
              </Box>
            </Box>
          )}
        </Box>
        
        <Box width="100%">
          <Heading size="md" mb={2}>Zero Value:</Heading>
          <Code p={2} display="block" mb={2}>
            {`{value: 0, unit: 'Wh'}`}
          </Code>
          <Text fontWeight="bold">Incorrect Way (0 is falsy):</Text>
          <Box borderWidth="1px" p={2} borderRadius="md">
            Value: {state.zeroValue.value || 'No value'} {state.zeroValue.unit}
          </Box>
          <Text fontWeight="bold" mt={2}>Correct Way (explicit check):</Text>
          <Box borderWidth="1px" p={2} borderRadius="md">
            Value: {state.zeroValue.value !== undefined ? state.zeroValue.value : 'No value'} {state.zeroValue.unit}
          </Box>
        </Box>
        
        <Box width="100%">
          <Heading size="md" mb={2}>Null or Undefined Values:</Heading>
          <Flex gap={4}>
            <Box flex="1">
              <Code p={2} display="block" mb={2}>
                {`{value: null, unit: 'Wh'}`}
              </Code>
              <Box borderWidth="1px" p={2} borderRadius="md">
                Value: {state.nullValue.value !== undefined && state.nullValue.value !== null ? state.nullValue.value : 0} {state.nullValue.unit}
              </Box>
            </Box>
            <Box flex="1">
              <Code p={2} display="block" mb={2}>
                {`{value: undefined, unit: 'Wh'}`}
              </Code>
              <Box borderWidth="1px" p={2} borderRadius="md">
                Value: {state.undefinedValue.value !== undefined ? state.undefinedValue.value : 0} {state.undefinedValue.unit}
              </Box>
            </Box>
          </Flex>
        </Box>
        
        <Box width="100%">
          <Heading size="md" mb={2}>Null or Undefined MeterValue:</Heading>
          <Flex gap={4}>
            <Box flex="1">
              <Code p={2} display="block" mb={2}>
                {`meterValue = null`}
              </Code>
              <Box borderWidth="1px" p={2} borderRadius="md">
                {state.nullMeterValue && typeof state.nullMeterValue === 'object' ? (
                  <Text>Value: {state.nullMeterValue.value} {state.nullMeterValue.unit}</Text>
                ) : (
                  <Text>No meter value</Text>
                )}
              </Box>
            </Box>
            <Box flex="1">
              <Code p={2} display="block" mb={2}>
                {`meterValue = undefined`}
              </Code>
              <Box borderWidth="1px" p={2} borderRadius="md">
                {state.undefinedMeterValue && typeof state.undefinedMeterValue === 'object' ? (
                  <Text>Value: {state.undefinedMeterValue.value} {state.undefinedMeterValue.unit}</Text>
                ) : (
                  <Text>No meter value</Text>
                )}
              </Box>
            </Box>
          </Flex>
        </Box>
        
        <Box width="100%">
          <Heading size="md" mb={2}>Missing Properties:</Heading>
          <Flex gap={4}>
            <Box flex="1">
              <Code p={2} display="block" mb={2}>
                {`{value: 42} (no unit)`}
              </Code>
              <Box borderWidth="1px" p={2} borderRadius="md">
                Value: {state.noUnit.value} {state.noUnit.unit || 'Wh'}
              </Box>
            </Box>
            <Box flex="1">
              <Code p={2} display="block" mb={2}>
                {`{} (empty object)`}
              </Code>
              <Box borderWidth="1px" p={2} borderRadius="md">
                Value: {state.emptyObject.value !== undefined ? state.emptyObject.value : 0} {state.emptyObject.unit || 'Wh'}
              </Box>
            </Box>
          </Flex>
        </Box>
      </VStack>
    </Box>
  );
};

export default TestPage; 