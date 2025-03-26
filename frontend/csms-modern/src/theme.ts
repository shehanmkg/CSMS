import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    brand: {
      50: "#e6f7ff",
      100: "#b3e0ff",
      200: "#80caff",
      300: "#4db3ff",
      400: "#1a9dff",
      500: "#0080ff", // Primary brand color
      600: "#0066cc",
      700: "#004d99",
      800: "#003366",
      900: "#001a33",
    },
    success: {
      500: '#52c41a',
    },
    warning: {
      500: '#faad14',
    },
    error: {
      500: '#f5222d',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  fonts: {
    body: "Inter, system-ui, sans-serif",
    heading: "Inter, system-ui, sans-serif",
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'md',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: {
            bg: 'brand.50',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'lg',
          boxShadow: 'md',
        },
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: 'semibold',
      },
    },
    Container: {
      baseStyle: {
        maxW: '100%',
      }
    },
    Box: {
      baseStyle: {
        maxWidth: '100%'
      }
    }
  },
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800",
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        width: '100%',
        overflow: 'hidden'
      },
      html: {
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      },
      "#root": {
        width: "100%", 
        height: "100%"
      }
    },
  },
});

export default theme; 