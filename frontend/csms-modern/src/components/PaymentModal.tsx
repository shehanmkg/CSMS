import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  Box,
  Select,
  FormControl,
  FormLabel,
  Spinner,
  useToast,
  Center,
  Flex,
  Badge,
  HStack,
  Icon,
  Divider
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import { ChargingStation, Connector, paymentApi } from '../api/api';

// Simple QR code component for payment simulation
const SimpleQRCode: React.FC<{ stationId: string; connectorId: string }> = ({ stationId, connectorId }) => (
  <Center
    bg="blackAlpha.100"
    boxSize="200px"
    border="2px dashed"
    borderColor="gray.300"
    borderRadius="md"
    flexDirection="column"
    p={4}
  >
    <Box width="80%" height="80%" bg="gray.700" borderRadius="md" position="relative">
      <Box position="absolute" top="10%" left="10%" width="20%" height="20%" bg="white" />
      <Box position="absolute" top="10%" right="10%" width="20%" height="20%" bg="white" />
      <Box position="absolute" bottom="10%" left="10%" width="20%" height="20%" bg="white" />
      <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" width="40%" height="40%" bg="white" borderRadius="sm" />
    </Box>
    <Text fontSize="xs" mt={2} textAlign="center">
      Scan to pay for Station {stationId}, Connector {connectorId}
    </Text>
  </Center>
);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: ChargingStation;
  onPaymentComplete?: () => void;
}

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

// Helper function to safely format power, handling potential object structure
const formatPowerValue = (power: number | { value: number; unit?: string } | null | undefined): string => {
  if (typeof power === 'object' && power !== null && 'value' in power && typeof power.value === 'number') {
    return `${power.value} ${power.unit || 'kW'}`;
  }
  if (typeof power === 'number') {
    return `${power} kW`;
  }
  return 'N/A kW'; // Default or fallback value
};

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, station, onPaymentComplete }) => {
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const toast = useToast();

  // Get connectors ready for payment (in Preparing status)
  const getPreparingConnectors = (): Connector[] => {
    if (!station.connectors) return [];

    // Handle both array and object formats
    if (Array.isArray(station.connectors)) {
      return station.connectors.filter(c => c.status === 'Preparing');
    } else {
      return Object.entries(station.connectors)
        .map(([id, connector]) => ({
          ...connector,
          id: id
        }))
        .filter(c => c.status === 'Preparing');
    }
  };

  const preparingConnectors = getPreparingConnectors();

  useEffect(() => {
    // Set the first preparing connector as selected by default
    if (preparingConnectors.length > 0 && !selectedConnector) {
      setSelectedConnector(preparingConnectors[0]);
    }
  }, [preparingConnectors, selectedConnector]);

  const handleConnectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const connectorId = e.target.value;
    const connector = preparingConnectors.find(c => c.id === connectorId) || null;
    setSelectedConnector(connector);
  };

  const handlePayment = async () => {
    if (!selectedConnector) {
      toast({
        title: "No connector selected",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setPaymentStatus('processing');

    try {
      // Process payment via API
      const result = await paymentApi.processPayment(
        station.id,
        selectedConnector.id
      );

      if (result.success) {
        setTransactionId(result.transactionId || null);
        setPaymentStatus('success');

        toast({
          title: "Payment successful",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        // Call the callback if provided after a delay to allow user to see the success state
        if (onPaymentComplete) {
          setTimeout(() => {
            onPaymentComplete();
          }, 2000);
        }
      } else {
        setPaymentStatus('error');
        toast({
          title: "Payment failed",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      setPaymentStatus('error');
      toast({
        title: "An error occurred while processing payment",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const renderContent = () => {
    switch (paymentStatus) {
      case 'processing':
        return (
          <Center py={10} flexDirection="column">
            <Spinner size="xl" color="blue.500" mb={4} />
            <Text>Processing your payment...</Text>
          </Center>
        );
      case 'success':
        return (
          <Center py={10} flexDirection="column">
            <CheckCircleIcon boxSize={12} color="green.500" mb={4} />
            <Text fontSize="xl" fontWeight="bold">Payment Successful!</Text>
            <Text mt={2}>Charging session is being initiated...</Text>
            {transactionId && (
              <Text mt={4} fontSize="sm" color="gray.600">
                Transaction ID: {transactionId}
              </Text>
            )}
          </Center>
        );
      case 'error':
        return (
          <Center py={10} flexDirection="column">
            <WarningIcon boxSize={12} color="red.500" mb={4} />
            <Text fontSize="xl" fontWeight="bold">Payment Failed</Text>
            <Text mt={2}>Please try again or use a different payment method.</Text>
            <Button mt={4} colorScheme="blue" onClick={() => setPaymentStatus('idle')}>
              Try Again
            </Button>
          </Center>
        );
      default:
        return (
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontWeight="bold" mb={2}>Select Connector:</Text>
              {preparingConnectors.length > 0 ? (
                <Select value={selectedConnector?.id || ''} onChange={handleConnectorChange}>
                  {preparingConnectors.map(connector => (
                    <option key={connector.id} value={connector.id}>
                      Connector {connector.id} - {connector.type} ({formatPowerValue(connector.power)})
                    </option>
                  ))}
                </Select>
              ) : (
                <Box p={3} bg="yellow.50" borderRadius="md">
                  <Text color="orange.700">
                    No connectors in "Preparing" state. Please ensure the charging cable is plugged into your vehicle.
                  </Text>
                </Box>
              )}
            </Box>

            {selectedConnector && (
              <>
                <Divider />
                <Box>
                  <Text fontWeight="bold" mb={2}>Payment Information:</Text>
                  <HStack justify="space-between">
                    <Text>Connector:</Text>
                    <Badge colorScheme="green">{selectedConnector.id}</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Type:</Text>
                    <Text>{selectedConnector.type}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Power:</Text>
                    <Text>{formatPowerValue(selectedConnector.power)}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Price:</Text>
                    <Text>$0.25 per kWh</Text>
                  </HStack>
                </Box>

                <Divider />
                <Box>
                  <Text fontWeight="bold" mb={3}>Scan to pay:</Text>
                  <Center>
                    <SimpleQRCode stationId={station.id} connectorId={selectedConnector.id} />
                  </Center>
                </Box>
              </>
            )}
          </VStack>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {paymentStatus === 'idle' ? 'Start Charging Session' :
           paymentStatus === 'processing' ? 'Processing Payment' :
           paymentStatus === 'success' ? 'Payment Complete' : 'Payment Error'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {paymentStatus === 'idle' && (
            <Box mb={4} p={3} bg="blue.50" borderRadius="md">
              <Text fontSize="sm" color="blue.700">
                Your vehicle is connected and ready for charging. Complete the payment to start charging.
              </Text>
            </Box>
          )}
          {renderContent()}
        </ModalBody>
        <ModalFooter>
          {paymentStatus === 'idle' && (
            <>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handlePayment}
                isDisabled={!selectedConnector || preparingConnectors.length === 0}
              >
                Pay Now
              </Button>
            </>
          )}
          {(paymentStatus === 'success' || paymentStatus === 'error') && (
            <Button colorScheme="blue" onClick={onClose}>
              Close
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PaymentModal;