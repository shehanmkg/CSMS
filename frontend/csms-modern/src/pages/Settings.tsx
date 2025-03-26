import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Switch,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  SimpleGrid,
  Divider,
  Text,
  Flex,
  useToast,
  FormHelperText,
  InputGroup,
  InputRightElement,
  IconButton
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, CheckIcon } from '@chakra-ui/icons';

const Settings: React.FC = () => {
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Mock save function
  const handleSave = (form: 'account' | 'system' | 'notifications' | 'security') => {
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings updated",
        description: `Your ${form} settings have been saved successfully.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }, 1000);
  };

  return (
    <Box width="100%">
      <Heading size={{ base: "lg", md: "xl" }} mb={{ base: 4, md: 6 }}>Settings</Heading>
      
      <Card shadow="sm" mb={5}>
        <CardBody>
          <Tabs colorScheme="brand" variant="enclosed">
            <TabList overflowX="auto" flexWrap="nowrap">
              <Tab fontSize={{ base: "sm", md: "md" }} minW={{ base: "auto", md: "150px" }}>Account</Tab>
              <Tab fontSize={{ base: "sm", md: "md" }} minW={{ base: "auto", md: "150px" }}>System</Tab>
              <Tab fontSize={{ base: "sm", md: "md" }} minW={{ base: "auto", md: "150px" }}>Notifications</Tab>
              <Tab fontSize={{ base: "sm", md: "md" }} minW={{ base: "auto", md: "150px" }}>Security</Tab>
            </TabList>
            
            <TabPanels>
              {/* Account Settings */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Heading size="md" mb={3}>Account Information</Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                    <FormControl>
                      <FormLabel>Name</FormLabel>
                      <Input defaultValue="John Doe" />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Email</FormLabel>
                      <Input defaultValue="john.doe@example.com" type="email" />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Role</FormLabel>
                      <Input defaultValue="Administrator" isReadOnly />
                      <FormHelperText>Contact system administrator to change role</FormHelperText>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Time Zone</FormLabel>
                      <Select defaultValue="America/New_York">
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                  
                  <Divider my={3} />
                  
                  <Heading size="md" mb={3}>Profile Information</Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                    <FormControl>
                      <FormLabel>Phone</FormLabel>
                      <Input defaultValue="+1 (555) 123-4567" />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Company</FormLabel>
                      <Input defaultValue="EV Charging Co." />
                    </FormControl>
                    
                    <FormControl gridColumn={{ md: "span 2" }}>
                      <FormLabel>Bio</FormLabel>
                      <Textarea rows={3} defaultValue="EV Charging Station operator with 5 years of experience." />
                    </FormControl>
                  </SimpleGrid>
                  
                  <Flex justifyContent="flex-end" mt={4}>
                    <Button colorScheme="brand" onClick={() => handleSave('account')} isLoading={isSaving}>
                      Save Changes
                    </Button>
                  </Flex>
                </VStack>
              </TabPanel>
              
              {/* System Settings */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Heading size="md" mb={3}>System Configuration</Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                    <FormControl>
                      <FormLabel>Default Price per kWh</FormLabel>
                      <InputGroup>
                        <Input defaultValue="0.25" type="number" step="0.01" />
                        <InputRightElement>$/kWh</InputRightElement>
                      </InputGroup>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Session Timeout</FormLabel>
                      <InputGroup>
                        <Input defaultValue="30" type="number" />
                        <InputRightElement>minutes</InputRightElement>
                      </InputGroup>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Transaction History Retention</FormLabel>
                      <Select defaultValue="365">
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="180">180 days</option>
                        <option value="365">1 year</option>
                        <option value="730">2 years</option>
                      </Select>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Default Language</FormLabel>
                      <Select defaultValue="en-US">
                        <option value="en-US">English (US)</option>
                        <option value="fr-FR">French</option>
                        <option value="es-ES">Spanish</option>
                        <option value="de-DE">German</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                  
                  <Divider my={3} />
                  
                  <Heading size="md" mb={3}>System Features</Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Enable Automatic Firmware Updates</FormLabel>
                      <Switch colorScheme="brand" defaultChecked />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Allow Remote Restart of Charging Stations</FormLabel>
                      <Switch colorScheme="brand" defaultChecked />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Enable Diagnostics Collection</FormLabel>
                      <Switch colorScheme="brand" defaultChecked />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">User Registration Open</FormLabel>
                      <Switch colorScheme="brand" />
                    </FormControl>
                  </SimpleGrid>
                  
                  <Flex justifyContent="flex-end" mt={4}>
                    <Button colorScheme="brand" onClick={() => handleSave('system')} isLoading={isSaving}>
                      Save Changes
                    </Button>
                  </Flex>
                </VStack>
              </TabPanel>
              
              {/* Notification Settings */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Heading size="md" mb={3}>Notification Preferences</Heading>
                  
                  <Text mb={3}>Configure when and how you receive alerts and notifications</Text>
                  
                  <SimpleGrid columns={{ base: 1, md: 1 }} spacing={5}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Email Notifications</FormLabel>
                      <Switch colorScheme="brand" defaultChecked />
                    </FormControl>
                    
                    <Divider />
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Station Fault Alerts</FormLabel>
                      <Switch colorScheme="brand" defaultChecked />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">New Transaction Notifications</FormLabel>
                      <Switch colorScheme="brand" />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">System Update Notifications</FormLabel>
                      <Switch colorScheme="brand" defaultChecked />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Security Alerts</FormLabel>
                      <Switch colorScheme="brand" defaultChecked />
                    </FormControl>
                    
                    <Divider />
                    
                    <FormControl>
                      <FormLabel>Summary Report Frequency</FormLabel>
                      <Select defaultValue="weekly">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="never">Never</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                  
                  <Flex justifyContent="flex-end" mt={4}>
                    <Button colorScheme="brand" onClick={() => handleSave('notifications')} isLoading={isSaving}>
                      Save Changes
                    </Button>
                  </Flex>
                </VStack>
              </TabPanel>
              
              {/* Security Settings */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Heading size="md" mb={3}>Security Settings</Heading>
                  
                  <Text mb={3}>Manage your password and security preferences</Text>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                    <FormControl>
                      <FormLabel>Current Password</FormLabel>
                      <InputGroup>
                        <Input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="Enter current password" 
                        />
                        <InputRightElement>
                          <IconButton
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                            onClick={() => setShowPassword(!showPassword)}
                            variant="ghost"
                            size="sm"
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                    
                    <Box></Box> {/* Empty box for grid alignment */}
                    
                    <FormControl>
                      <FormLabel>New Password</FormLabel>
                      <InputGroup>
                        <Input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="Enter new password" 
                        />
                        <InputRightElement>
                          <IconButton
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                            onClick={() => setShowPassword(!showPassword)}
                            variant="ghost"
                            size="sm"
                          />
                        </InputRightElement>
                      </InputGroup>
                      <FormHelperText>
                        Password must be at least 8 characters with a number and special character
                      </FormHelperText>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Confirm New Password</FormLabel>
                      <InputGroup>
                        <Input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="Confirm new password" 
                        />
                        <InputRightElement>
                          <IconButton
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                            onClick={() => setShowPassword(!showPassword)}
                            variant="ghost"
                            size="sm"
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                  </SimpleGrid>
                  
                  <Divider my={3} />
                  
                  <SimpleGrid columns={{ base: 1, md: 1 }} spacing={5}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Two-Factor Authentication</FormLabel>
                      <Switch colorScheme="brand" />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Login Notification</FormLabel>
                      <Switch colorScheme="brand" defaultChecked />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Session Timeout</FormLabel>
                      <Select defaultValue="30">
                        <option value="5">5 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                  
                  <Flex justifyContent="flex-end" mt={4}>
                    <Button colorScheme="brand" onClick={() => handleSave('security')} isLoading={isSaving}>
                      Save Changes
                    </Button>
                  </Flex>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
    </Box>
  );
};

export default Settings; 