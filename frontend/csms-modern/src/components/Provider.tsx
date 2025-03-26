import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../theme';

interface ProviderProps {
  children: React.ReactNode;
}

export const Provider: React.FC<ProviderProps> = ({ children }) => {
  return (
    <ChakraProvider theme={theme}>
      {children}
    </ChakraProvider>
  );
}; 