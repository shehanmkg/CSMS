/**
 * CSMS Dashboard Main Script
 * Handles navigation, global state, and common functionality
 */

// Global state
const state = {
  stations: [],
  transactions: [],
  activeSection: 'stations-section',
  lastUpdated: new Date(),
  refreshInterval: 10000, // 10 seconds
  initialized: false,
  debug: true // Enable debug mode
};

// DOM Elements
const navLinks = document.querySelectorAll('.app-nav a');
const sections = document.querySelectorAll('.content-section');
const lastUpdatedEl = document.getElementById('last-updated');
const activeStationsCount = document.getElementById('active-stations-count');
const activeTransactionsCount = document.getElementById('active-transactions-count');
const totalEnergy = document.getElementById('total-energy');

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Log startup message
  if (state.debug) {
    console.log('CSMS Dashboard initializing...');
  }
  
  // Set up navigation
  setupNavigation();
  
  // Initialize data
  initData();
  
  // Set up refresh interval
  setInterval(refreshData, state.refreshInterval);
  
  // Update last updated timestamp
  updateLastUpdated();
});

/**
 * Set up navigation between sections
 */
function setupNavigation() {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Get the target section
      const targetSection = link.getAttribute('data-section');
      
      // Update active link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Show target section, hide others
      sections.forEach(section => {
        if (section.id === targetSection) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      });
      
      // Update state
      state.activeSection = targetSection;
      
      // Update URL hash
      window.location.hash = link.getAttribute('href');
    });
  });
  
  // Check for hash in URL
  if (window.location.hash) {
    const hash = window.location.hash;
    const matchingLink = Array.from(navLinks).find(link => link.getAttribute('href') === hash);
    if (matchingLink) {
      matchingLink.click();
    }
  }
}

/**
 * Initialize dashboard data
 */
async function initData() {
  try {
    if (state.debug) {
      console.log('Loading initial data...');
    }
    
    const results = await Promise.all([
      loadStations(),
      loadTransactions()
    ]);
    
    if (state.debug) {
      console.log('Initial data loaded:', { 
        stations: results[0], 
        transactions: results[1] 
      });
    }
    
    state.initialized = true;
    updateDashboardStats();
    
    // Initialize component-specific functionality
    if (typeof initStations === 'function') initStations(state);
    if (typeof initTransactions === 'function') initTransactions(state);
    
    // Handle analytics initialization separately with error catching
    try {
      if (typeof initAnalytics === 'function') initAnalytics(state);
    } catch (analyticsError) {
      console.error('Error initializing analytics, but continuing with dashboard:', analyticsError);
      // Don't show error to user, just log it - dashboard should still function
    }
    
  } catch (error) {
    console.error('Error initializing data:', error);
    
    // Show more detailed error info in debug mode
    if (state.debug) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        type: error.name
      });
    }
    
    showError('Failed to load data. Please try refreshing the page. Error: ' + error.message);
  }
}

/**
 * Refresh data periodically
 */
async function refreshData() {
  try {
    if (state.debug) {
      console.log('Refreshing data...');
    }
    
    await Promise.all([
      loadStations(),
      loadTransactions()
    ]);
    
    updateDashboardStats();
    updateLastUpdated();
    
    // Update component-specific data if they exist
    if (typeof updateStations === 'function') updateStations(state);
    if (typeof updateTransactions === 'function') updateTransactions(state);
    if (typeof updateAnalytics === 'function') updateAnalytics(state);
    
  } catch (error) {
    console.error('Error refreshing data:', error);
    
    // Only show an error to the user if we haven't initialized yet
    // This prevents constant error messages during refresh attempts
    if (!state.initialized) {
      showError('Failed to refresh data. Please check your connection.');
    }
  }
}

/**
 * Load stations data from API
 */
async function loadStations() {
  if (state.debug) {
    console.log('Fetching stations from API...');
  }
  
  try {
    const response = await fetch('/api/stations');
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to load stations: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (state.debug) {
      console.log(`Received ${data.stations?.length || 0} stations from API`);
    }
    
    state.stations = data.stations || [];
    return data;
  } catch (error) {
    console.error('Station fetch error:', error);
    throw error;
  }
}

/**
 * Load transactions data from API
 */
async function loadTransactions() {
  if (state.debug) {
    console.log('Fetching transactions from API...');
  }
  
  try {
    const response = await fetch('/api/transactions');
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to load transactions: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (state.debug) {
      console.log(`Received ${data.transactions?.length || 0} transactions from API`);
    }
    
    state.transactions = data.transactions || [];
    return data;
  } catch (error) {
    console.error('Transaction fetch error:', error);
    throw error;
  }
}

/**
 * Update the last updated timestamp
 */
function updateLastUpdated() {
  state.lastUpdated = new Date();
  lastUpdatedEl.textContent = formatDateTime(state.lastUpdated);
}

/**
 * Update dashboard stats in the header
 */
function updateDashboardStats() {
  // Count active stations (not Unavailable or Faulted)
  const active = state.stations.filter(station => 
    station.status && !['Unavailable', 'Faulted'].includes(station.status)
  ).length;
  
  // Count active transactions (not completed)
  const activeTx = state.transactions.filter(tx => 
    tx.status === 'Active' || !tx.stopTimestamp
  ).length;
  
  // Calculate total energy in kWh
  const totalKwh = state.transactions.reduce((sum, tx) => {
    const energyUsed = tx.energyUsed || 0;
    return sum + energyUsed;
  }, 0) / 1000; // Convert from Wh to kWh
  
  // Update DOM
  activeStationsCount.textContent = active;
  activeTransactionsCount.textContent = activeTx;
  totalEnergy.textContent = `${totalKwh.toFixed(2)} kWh`;
  
  if (state.debug) {
    console.log('Dashboard stats updated:', {
      activeStations: active,
      activeTransactions: activeTx,
      totalEnergyKwh: totalKwh.toFixed(2)
    });
  }
}

/**
 * Show error message to user
 */
function showError(message) {
  console.error('Dashboard error:', message);
  
  // Create an error element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `
    <div class="error-content">
      <h3>Error</h3>
      <p>${message}</p>
      <button id="error-retry-btn">Retry</button>
    </div>
  `;
  
  // Add styles directly for the error message
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.height = '100%';
  errorDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
  errorDiv.style.display = 'flex';
  errorDiv.style.justifyContent = 'center';
  errorDiv.style.alignItems = 'center';
  errorDiv.style.zIndex = '9999';
  
  // Error content styles
  const errorContent = errorDiv.querySelector('.error-content');
  if (errorContent) {
    errorContent.style.backgroundColor = 'white';
    errorContent.style.padding = '2rem';
    errorContent.style.borderRadius = '8px';
    errorContent.style.maxWidth = '500px';
    errorContent.style.textAlign = 'center';
  }
  
  // Add to document
  document.body.appendChild(errorDiv);
  
  // Add event listener for retry button
  document.getElementById('error-retry-btn').addEventListener('click', () => {
    // Remove error message
    errorDiv.remove();
    
    // Try to initialize data again
    initData();
  });
}

/**
 * Format a date for display
 */
function formatDate(date) {
  if (!date) return '--';
  
  const d = new Date(date);
  return d.toLocaleDateString();
}

/**
 * Format a time for display
 */
function formatTime(date) {
  if (!date) return '--';
  
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date and time for display
 */
function formatDateTime(date) {
  if (!date) return '--';
  
  const d = new Date(date);
  return `${formatDate(d)} ${formatTime(d)}`;
}

/**
 * Format a duration in milliseconds to a readable string
 */
function formatDuration(ms) {
  if (!ms) return '--';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Calculate duration between two dates
 */
function calculateDuration(startDate, endDate) {
  if (!startDate) return null;
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  return end - start; // Duration in milliseconds
}

// Add a helper method to check API availability
async function checkApiHealth() {
  try {
    const response = await fetch('/health');
    const data = await response.json();
    console.log('API health check:', data);
    return data.status === 'ok';
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

// Call health check on load
window.addEventListener('load', () => {
  if (state.debug) {
    checkApiHealth();
  }
});

// Export utility functions for other modules
window.csmsUtils = {
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  calculateDuration,
  checkApiHealth
}; 