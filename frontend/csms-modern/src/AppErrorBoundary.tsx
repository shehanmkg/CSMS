import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Heading, Text, Code, Button, VStack, HStack, Divider, Badge } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('Error caught by error boundary:', error, errorInfo);
  }

  render(): ReactNode {
    // Check if there's an error
    if (this.state.hasError) {
      // Check specifically for the React "Objects are not valid as a React child" error
      const isObjectAsChildError = this.state.error?.message.includes("Objects are not valid as a React child");
      
      return (
        <Box p={5} maxW="1200px" mx="auto">
          <VStack align="start" spacing={4}>
            <Badge colorScheme="red" fontSize="lg" p={2}>App Error</Badge>
            <Heading size="lg" color="red.500">Something went wrong</Heading>
            
            {isObjectAsChildError && (
              <Box bg="yellow.50" p={4} borderRadius="md" w="100%">
                <Heading size="md" color="orange.600" mb={2}>Object Rendering Error Detected</Heading>
                <Text color="orange.800">
                  React cannot render objects directly. This usually happens when you try to render an object like {`{value: 42, unit: 'Wh'}`} directly in JSX.
                </Text>
                <Text mt={2} fontWeight="bold">Common fixes:</Text>
                <VStack align="start" pl={4} mt={2} spacing={1}>
                  <Text>1. Access object properties individually: {`{meterValue.value} {meterValue.unit}`}</Text>
                  <Text>2. Add proper type checking: {`{meterValue && typeof meterValue === 'object' && meterValue.value}`}</Text>
                  <Text>3. Convert to string: {`{JSON.stringify(meterValue)}`}</Text>
                </VStack>
              </Box>
            )}
            
            <Box bg="red.50" p={4} borderRadius="md" w="100%">
              <Heading size="sm" mb={2}>Error Details:</Heading>
              <Code p={2} colorScheme="red" display="block" whiteSpace="pre-wrap">
                {this.state.error?.toString()}
              </Code>
            </Box>
            
            <Divider />
            
            <Box bg="gray.50" p={4} borderRadius="md" w="100%">
              <Heading size="sm" mb={2}>Component Stack:</Heading>
              <Code p={2} colorScheme="gray" display="block" whiteSpace="pre-wrap">
                {this.state.errorInfo?.componentStack}
              </Code>
            </Box>
            
            <HStack spacing={4} mt={4}>
              <Button colorScheme="blue" onClick={() => window.location.reload()}>
                Reload Application
              </Button>
              <Button 
                colorScheme="green" 
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
              >
                Try to Recover
              </Button>
            </HStack>
          </VStack>
        </Box>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default AppErrorBoundary; 