import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  useToast,
  Spinner,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  VStack,
  HStack,
  Avatar,
  useBreakpointValue
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, EditIcon, DeleteIcon, EmailIcon } from '@chakra-ui/icons';

// User interface
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
}

// Sample user data (in a real app, this would come from an API)
const sampleUsers: User[] = [
  { 
    id: '1', 
    name: 'John Doe', 
    email: 'john.doe@example.com', 
    role: 'Admin', 
    status: 'Active',
    lastActive: '2023-08-15T14:32:21'
  },
  { 
    id: '2', 
    name: 'Jane Smith', 
    email: 'jane.smith@example.com', 
    role: 'Operator', 
    status: 'Active',
    lastActive: '2023-08-15T09:12:45'
  },
  { 
    id: '3', 
    name: 'Robert Johnson', 
    email: 'robert.j@example.com', 
    role: 'User', 
    status: 'Inactive',
    lastActive: '2023-07-28T16:48:33'
  },
  { 
    id: '4', 
    name: 'Emily Wilson', 
    email: 'emily.w@example.com', 
    role: 'Operator', 
    status: 'Active',
    lastActive: '2023-08-14T11:23:09'
  },
  { 
    id: '5', 
    name: 'Michael Brown', 
    email: 'michael.b@example.com', 
    role: 'User', 
    status: 'Pending',
    lastActive: '2023-08-10T08:54:15'
  }
];

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { isOpen: isAddUserOpen, onOpen: onAddUserOpen, onClose: onAddUserClose } = useDisclosure();
  const toast = useToast();
  
  // Use breakpoint to determine display mode
  const displayMode = useBreakpointValue<'table' | 'cards'>({ 
    base: 'cards', 
    md: 'table' 
  }) || 'cards';

  // Fetch users on component mount
  useEffect(() => {
    // Simulate API fetch
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // In a real app, this would be an API call
        // const response = await api.getUsers();
        // setUsers(response.data);
        
        // Using sample data for demonstration
        setTimeout(() => {
          setUsers(sampleUsers);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch users. Please try again later.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);

  // Filter users based on search term and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
                         user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Format last active time
  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge colorScheme="green">Active</Badge>;
      case 'Inactive':
        return <Badge colorScheme="red">Inactive</Badge>;
      case 'Pending':
        return <Badge colorScheme="yellow">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Role badges
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Badge colorScheme="purple">Admin</Badge>;
      case 'Operator':
        return <Badge colorScheme="blue">Operator</Badge>;
      case 'User':
        return <Badge colorScheme="gray">User</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Get avatar color based on role
  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'purple';
      case 'Operator':
        return 'blue';
      case 'User':
        return 'gray';
      default:
        return 'teal';
    }
  };

  // Table view for users
  const renderUsersTable = () => (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Last Active</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredUsers.map((user) => (
            <Tr key={user.id}>
              <Td>
                <Flex align="center">
                  <Avatar 
                    size="sm" 
                    name={user.name} 
                    bg={`${getAvatarColor(user.role)}.500`} 
                    color="white"
                    mr={2}
                  />
                  {user.name}
                </Flex>
              </Td>
              <Td>{user.email}</Td>
              <Td>{getRoleBadge(user.role)}</Td>
              <Td>{getStatusBadge(user.status)}</Td>
              <Td>{formatLastActive(user.lastActive)}</Td>
              <Td>
                <IconButton
                  aria-label="Edit user"
                  icon={<EditIcon />}
                  size="sm"
                  colorScheme="blue"
                  mr={2}
                />
                <IconButton
                  aria-label="Delete user"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  mr={2}
                />
                <IconButton
                  aria-label="Email user"
                  icon={<EmailIcon />}
                  size="sm"
                  colorScheme="green"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );

  // Card view for users (mobile)
  const renderUsersCards = () => (
    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
      {filteredUsers.map((user) => (
        <Card key={user.id} shadow="md">
          <CardHeader pb={2}>
            <Flex justifyContent="space-between" alignItems="center">
              <Flex align="center">
                <Avatar 
                  size="md" 
                  name={user.name} 
                  bg={`${getAvatarColor(user.role)}.500`} 
                  color="white"
                  mr={3}
                />
                <Box>
                  <Heading size="sm">{user.name}</Heading>
                  <Text fontSize="sm" color="gray.600">{user.email}</Text>
                </Box>
              </Flex>
              {getStatusBadge(user.status)}
            </Flex>
          </CardHeader>
          <CardBody pt={2}>
            <VStack align="stretch" spacing={2}>
              <Flex justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Role:</Text>
                {getRoleBadge(user.role)}
              </Flex>
              <Flex justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Last Active:</Text>
                <Text fontSize="sm">{formatLastActive(user.lastActive)}</Text>
              </Flex>
              <HStack spacing={2} mt={3} justifyContent="flex-end">
                <IconButton
                  aria-label="Edit user"
                  icon={<EditIcon />}
                  size="sm"
                  colorScheme="blue"
                />
                <IconButton
                  aria-label="Delete user"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                />
                <IconButton
                  aria-label="Email user"
                  icon={<EmailIcon />}
                  size="sm"
                  colorScheme="green"
                />
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      ))}
    </SimpleGrid>
  );

  if (loading) {
    return (
      <Flex p={5} height="200px" justify="center" align="center" direction="column">
        <Spinner size="xl" color="brand.500" thickness="4px" />
        <Text mt={4} fontSize="lg">Loading users...</Text>
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
        gap={{ base: 2, sm: 0 }}
      >
        <Heading size={{ base: "lg", md: "xl" }}>Users</Heading>
        <Button 
          leftIcon={<AddIcon />} 
          colorScheme="brand" 
          onClick={onAddUserOpen}
          width={{ base: 'full', sm: 'auto' }}
        >
          Add User
        </Button>
      </Flex>

      <Flex 
        mb={{ base: 4, md: 6 }} 
        gap={4} 
        flexWrap={{ base: 'wrap', md: 'nowrap' }}
        direction={{ base: 'column', md: 'row' }}
      >
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.300" />
          </InputLeftElement>
          <Input 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        
        <Select 
          width={{ base: 'full', md: '200px' }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Operator">Operator</option>
          <option value="User">User</option>
        </Select>
      </Flex>

      {filteredUsers.length === 0 ? (
        <Text textAlign="center" p={6} bg="gray.50" borderRadius="md">
          No users match your search criteria.
        </Text>
      ) : displayMode === 'table' ? renderUsersTable() : renderUsersCards()}

      {/* Add User Modal */}
      <Modal isOpen={isAddUserOpen} onClose={onAddUserClose} size={{ base: 'full', md: 'md' }}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input placeholder="Enter full name" />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input placeholder="Enter email address" type="email" />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Role</FormLabel>
                <Select>
                  <option value="Admin">Admin</option>
                  <option value="Operator">Operator</option>
                  <option value="User">User</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select defaultValue="Active">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input type="password" placeholder="Enter password" />
              </FormControl>
              
              <FormControl>
                <FormLabel>Confirm Password</FormLabel>
                <Input type="password" placeholder="Confirm password" />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="gray" mr={3} onClick={onAddUserClose}>
              Cancel
            </Button>
            <Button colorScheme="brand">
              Add User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Users; 