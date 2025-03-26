import React, { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  IconButton,
  Heading,
  Link,
  Spacer,
  useColorMode,
  useColorModeValue,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Icon,
  useBreakpointValue
} from '@chakra-ui/react';
import {
  FiMenu,
  FiHome,
  FiZap,
  FiList,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiBell,
  FiMoon,
  FiSun,
  FiChevronDown,
  FiSearch
} from 'react-icons/fi';

// Navigation items
const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: FiHome },
  { name: 'Charging Stations', path: '/stations', icon: FiZap },
  { name: 'Transactions', path: '/transactions', icon: FiList },
  { name: 'Users', path: '/users', icon: FiUsers },
  { name: 'Analytics', path: '/analytics', icon: FiBarChart2 },
  { name: 'Settings', path: '/settings', icon: FiSettings }
];

const Layout = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const location = useLocation();
  
  // Responsive design values
  const sidebarWidth = useBreakpointValue({ base: 'full', md: '240px' }) || '240px';
  const isMobile = useBreakpointValue({ base: true, md: false }) || false;
  
  // Set sidebar background color based on color mode
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // SidebarItem component for navigation
  const SidebarItem = ({ icon, children, path }: { icon: React.ElementType; children: React.ReactNode; path: string }) => {
    const isActive = location.pathname === path;
    const activeBg = useColorModeValue('brand.50', 'brand.900');
    const activeColor = useColorModeValue('brand.600', 'brand.200');
    const hoverBg = useColorModeValue('gray.100', 'gray.700');
    
    return (
      <Link 
        as={RouterLink} 
        to={path} 
        _hover={{ textDecoration: 'none' }}
        w="100%"
        onClick={isMobile ? onClose : undefined}
      >
        <Flex
          align="center"
          p="3"
          mx="2"
          borderRadius="md"
          role="group"
          cursor="pointer"
          bg={isActive ? activeBg : 'transparent'}
          color={isActive ? activeColor : undefined}
          _hover={{
            bg: !isActive ? hoverBg : activeBg,
          }}
          fontWeight={isActive ? "bold" : "normal"}
        >
          <Icon as={icon} mr="3" fontSize="16" />
          <Text>{children}</Text>
        </Flex>
      </Link>
    );
  };

  // Mobile sidebar drawer
  const MobileSidebar = () => (
    <>
      <IconButton
        aria-label="Open menu"
        icon={<FiMenu />}
        onClick={onOpen}
        display={{ base: 'flex', md: 'none' }}
        variant="ghost"
      />
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <Flex align="center">
              <Box boxSize="30px" bg="brand.500" borderRadius="md" mr={2} />
              <Heading size="md">CSMS</Heading>
            </Flex>
          </DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={1} mt={4}>
              {navItems.map((item) => (
                <SidebarItem key={item.path} path={item.path} icon={item.icon}>
                  {item.name}
                </SidebarItem>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );

  // Desktop sidebar
  const DesktopSidebar = () => (
    <Box
      as="nav"
      pos="fixed"
      top="0"
      left="0"
      h="100vh"
      w={sidebarWidth}
      bg={sidebarBg}
      borderRight="1px"
      borderRightColor={borderColor}
      display={{ base: 'none', md: 'block' }}
      overflowY="auto"
    >
      <Flex p="4" align="center">
        <Box boxSize="30px" bg="brand.500" borderRadius="md" mr={2} />
        <Heading size="md">CSMS</Heading>
      </Flex>
      <VStack align="stretch" spacing={1} mt={6}>
        {navItems.map((item) => (
          <SidebarItem key={item.path} path={item.path} icon={item.icon}>
            {item.name}
          </SidebarItem>
        ))}
      </VStack>
    </Box>
  );

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')} width="100vw" maxWidth="100%">
      {/* Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <Box ml={{ base: 0, md: sidebarWidth }} width={{ base: "100%", md: `calc(100% - ${sidebarWidth})` }}>
        {/* Header */}
        <Flex
          as="header"
          position="sticky"
          top="0"
          zIndex="1"
          bg={useColorModeValue('white', 'gray.800')}
          borderBottomWidth="1px"
          borderBottomColor={borderColor}
          h="16"
          align="center"
          px="4"
          width="100%"
        >
          <MobileSidebar />
          
          <Spacer display={{ base: 'none', md: 'block' }} />
          
          <HStack spacing={4}>
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
              onClick={toggleColorMode}
              variant="ghost"
              size="md"
            />
            
            <IconButton
              aria-label="Search"
              icon={<FiSearch />}
              variant="ghost"
              size="md"
            />
            
            <IconButton
              aria-label="Notifications"
              icon={<FiBell />}
              variant="ghost"
              size="md"
            />
            
            <Menu>
              <MenuButton as={Button} rightIcon={<FiChevronDown />} variant="ghost" px={2}>
                <HStack>
                  <Avatar size="sm" name="John Doe" />
                  <Text display={{ base: 'none', md: 'block' }}>John Doe</Text>
                </HStack>
              </MenuButton>
              <MenuList>
                <MenuItem>Profile</MenuItem>
                <MenuItem>Account Settings</MenuItem>
                <MenuItem icon={<FiLogOut />}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
        
        {/* Main Content */}
        <Box as="main" p="4" width="100%">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout; 