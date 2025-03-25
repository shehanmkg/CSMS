/**
 * Stations Module
 * Handles station listing, filtering, and details view
 */

// DOM Elements
const stationsGrid = document.getElementById('stations-grid');
const stationSearch = document.getElementById('station-search');
const statusFilter = document.getElementById('status-filter');
const stationModal = document.getElementById('station-modal');
const modalClose = document.querySelector('.close-modal');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Templates
const stationCardTemplate = document.getElementById('station-card-template');
const connectorItemTemplate = document.getElementById('connector-item-template');

// Module state
const stationsState = {
  filter: {
    search: '',
    status: 'all'
  },
  selectedStation: null
};

/**
 * Initialize stations module
 */
function initStations(globalState) {
  // Set up event listeners
  setupStationEvents();
  
  // Render stations
  renderStations(globalState.stations);
}

/**
 * Update stations when data changes
 */
function updateStations(globalState) {
  renderStations(globalState.stations);
  
  // If modal is open, update that too
  if (stationsState.selectedStation && stationModal.style.display === 'block') {
    const updatedStation = globalState.stations.find(
      s => s.id === stationsState.selectedStation.id
    );
    
    if (updatedStation) {
      stationsState.selectedStation = updatedStation;
      updateStationModal(updatedStation, globalState);
    }
  }
}

/**
 * Set up event listeners for stations functionality
 */
function setupStationEvents() {
  // Search filter
  stationSearch.addEventListener('input', e => {
    stationsState.filter.search = e.target.value.toLowerCase();
    applyFilters();
  });
  
  // Status filter
  statusFilter.addEventListener('change', e => {
    stationsState.filter.status = e.target.value;
    applyFilters();
  });
  
  // Modal close button
  modalClose.addEventListener('click', () => {
    stationModal.style.display = 'none';
    stationsState.selectedStation = null;
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', e => {
    if (e.target === stationModal) {
      stationModal.style.display = 'none';
      stationsState.selectedStation = null;
    }
  });
  
  // Tab navigation in modal
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show corresponding content
      tabContents.forEach(content => {
        if (content.id === tabId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });
}

/**
 * Apply filters to stations
 */
function applyFilters() {
  // Get all station cards
  const cards = stationsGrid.querySelectorAll('.station-card');
  
  cards.forEach(card => {
    const id = card.getAttribute('data-id');
    const name = card.querySelector('.station-name').textContent.toLowerCase();
    const status = card.querySelector('.station-status').textContent;
    
    // Check if station matches search text
    const matchesSearch = stationsState.filter.search === '' || 
      name.includes(stationsState.filter.search) || 
      id.toLowerCase().includes(stationsState.filter.search);
    
    // Check if station matches status filter
    const matchesStatus = stationsState.filter.status === 'all' || 
      status === stationsState.filter.status;
    
    // Show/hide card based on filters
    if (matchesSearch && matchesStatus) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

/**
 * Render stations to the grid
 */
function renderStations(stations) {
  // Clear loading state
  if (stationsGrid.querySelector('.loading')) {
    stationsGrid.innerHTML = '';
  }
  
  // Check if we need to add or update
  if (stationsGrid.children.length === 0) {
    // Initial render
    const fragment = document.createDocumentFragment();
    
    stations.forEach(station => {
      const card = createStationCard(station);
      fragment.appendChild(card);
    });
    
    stationsGrid.appendChild(fragment);
  } else {
    // Update existing cards and add new ones
    const existingIds = new Set(
      Array.from(stationsGrid.querySelectorAll('.station-card'))
        .map(card => card.getAttribute('data-id'))
    );
    
    // Update existing cards
    stations.forEach(station => {
      if (existingIds.has(station.id)) {
        updateStationCard(station);
        existingIds.delete(station.id);
      } else {
        // Add new card
        const card = createStationCard(station);
        stationsGrid.appendChild(card);
      }
    });
    
    // Remove cards for stations that no longer exist
    existingIds.forEach(id => {
      const card = stationsGrid.querySelector(`.station-card[data-id="${id}"]`);
      if (card) {
        card.remove();
      }
    });
  }
  
  // Apply current filters
  applyFilters();
}

/**
 * Create a new station card
 */
function createStationCard(station) {
  // Clone template
  const template = stationCardTemplate.content.cloneNode(true);
  const card = template.querySelector('.station-card');
  
  // Set card data
  card.setAttribute('data-id', station.id);
  
  // Set card content
  card.querySelector('.station-name').textContent = station.id;
  
  const statusEl = card.querySelector('.station-status');
  statusEl.textContent = station.status || 'Unknown';
  statusEl.classList.add(`status-${station.status || 'Unknown'}`);
  
  card.querySelector('.station-model').textContent = station.chargePointModel || '--';
  card.querySelector('.station-vendor').textContent = station.chargePointVendor || '--';
  
  const heartbeatTime = station.lastHeartbeat ? 
    window.csmsUtils.formatDateTime(station.lastHeartbeat) : '--';
  card.querySelector('.station-heartbeat').textContent = heartbeatTime;
  
  // Add connectors if available
  const connectorList = card.querySelector('.connector-list');
  
  if (station.connectors && Object.keys(station.connectors).length > 0) {
    Object.entries(station.connectors).forEach(([connectorId, data]) => {
      const connectorEl = createConnectorItem(connectorId, data);
      connectorList.appendChild(connectorEl);
    });
  } else {
    // No connectors
    connectorList.innerHTML = '<div class="no-connectors">No connectors available</div>';
  }
  
  // Add event listener for details button
  card.querySelector('.view-details-btn').addEventListener('click', () => {
    openStationDetails(station);
  });
  
  return card;
}

/**
 * Update an existing station card
 */
function updateStationCard(station) {
  const card = stationsGrid.querySelector(`.station-card[data-id="${station.id}"]`);
  
  if (!card) return;
  
  // Update status
  const statusEl = card.querySelector('.station-status');
  const currentStatus = statusEl.textContent;
  
  if (currentStatus !== station.status) {
    statusEl.textContent = station.status || 'Unknown';
    
    // Remove old status class
    statusEl.classList.forEach(cls => {
      if (cls.startsWith('status-')) {
        statusEl.classList.remove(cls);
      }
    });
    
    statusEl.classList.add(`status-${station.status || 'Unknown'}`);
  }
  
  // Update last heartbeat
  const heartbeatTime = station.lastHeartbeat ? 
    window.csmsUtils.formatDateTime(station.lastHeartbeat) : '--';
  card.querySelector('.station-heartbeat').textContent = heartbeatTime;
  
  // Update connectors
  const connectorList = card.querySelector('.connector-list');
  
  // Clear existing connectors
  connectorList.innerHTML = '';
  
  if (station.connectors && Object.keys(station.connectors).length > 0) {
    Object.entries(station.connectors).forEach(([connectorId, data]) => {
      const connectorEl = createConnectorItem(connectorId, data);
      connectorList.appendChild(connectorEl);
    });
  } else {
    // No connectors
    connectorList.innerHTML = '<div class="no-connectors">No connectors available</div>';
  }
}

/**
 * Create a connector item element
 */
function createConnectorItem(connectorId, data) {
  // Clone template
  const template = connectorItemTemplate.content.cloneNode(true);
  const connectorEl = template.querySelector('.connector-item');
  
  // Set connector content
  connectorEl.querySelector('.connector-id').textContent = `Connector ${connectorId}`;
  
  // Set status if available
  if (data.status) {
    const statusEl = connectorEl.querySelector('.connector-status');
    statusEl.textContent = data.status;
    statusEl.classList.add(`status-${data.status}`);
  }
  
  // Set meter value if available
  if (data.meterValue) {
    const value = data.meterValue.value || 0;
    const unit = data.meterValue.unit || 'Wh';
    
    connectorEl.querySelector('.meter-value').textContent = value;
    connectorEl.querySelector('.meter-unit').textContent = unit;
  } else {
    connectorEl.querySelector('.connector-meter').textContent = 'No meter data';
  }
  
  return connectorEl;
}

/**
 * Open the station details modal
 */
function openStationDetails(station) {
  stationsState.selectedStation = station;
  
  // Set station name
  document.getElementById('modal-station-name').textContent = station.id;
  
  // Reset active tab
  tabButtons.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  document.querySelector('[data-tab="info-tab"]').classList.add('active');
  document.getElementById('info-tab').classList.add('active');
  
  // Populate station info
  populateStationInfo(station);
  
  // Show the modal
  stationModal.style.display = 'block';
  
  // Load station transactions
  loadStationTransactions(station.id);
}

/**
 * Update the station modal with latest data
 */
function updateStationModal(station, globalState) {
  // Update info tab
  populateStationInfo(station);
  
  // Update transactions tab if it's active
  if (document.getElementById('transactions-tab').classList.contains('active')) {
    const stationTransactions = globalState.transactions.filter(
      tx => tx.chargePointId === station.id
    );
    
    renderStationTransactions(stationTransactions);
  }
}

/**
 * Populate the station info tab
 */
function populateStationInfo(station) {
  const infoGrid = document.querySelector('.info-grid');
  infoGrid.innerHTML = '';
  
  // Basic station information
  const basicInfo = {
    'Charge Point ID': station.id,
    'Vendor': station.chargePointVendor || '--',
    'Model': station.chargePointModel || '--',
    'Firmware': station.firmwareVersion || '--',
    'Status': station.status || '--',
    'Last Heartbeat': station.lastHeartbeat ? 
      window.csmsUtils.formatDateTime(station.lastHeartbeat) : '--',
    'Registration': station.registeredAt ? 
      window.csmsUtils.formatDateTime(station.registeredAt) : '--'
  };
  
  // Add basic info
  Object.entries(basicInfo).forEach(([label, value]) => {
    const infoItem = document.createElement('div');
    infoItem.className = 'info-item';
    infoItem.innerHTML = `
      <span class="info-label">${label}</span>
      <span class="info-value">${value}</span>
    `;
    infoGrid.appendChild(infoItem);
  });
  
  // Add connector information
  if (station.connectors && Object.keys(station.connectors).length > 0) {
    Object.entries(station.connectors).forEach(([connectorId, data]) => {
      const connectorInfo = document.createElement('div');
      connectorInfo.className = 'connector-info';
      
      let meterValueText = 'No meter data';
      if (data.meterValue) {
        const value = data.meterValue.value || 0;
        const unit = data.meterValue.unit || 'Wh';
        const timestamp = data.meterValue.timestamp ? 
          ` (at ${window.csmsUtils.formatTime(data.meterValue.timestamp)})` : '';
        
        meterValueText = `${value} ${unit}${timestamp}`;
      }
      
      connectorInfo.innerHTML = `
        <h4>Connector ${connectorId}</h4>
        <div class="connector-details">
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="info-value status-${data.status || 'Unknown'}">${data.status || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Meter Value</span>
            <span class="info-value">${meterValueText}</span>
          </div>
        </div>
      `;
      
      infoGrid.appendChild(connectorInfo);
    });
  }
}

/**
 * Load transactions for a specific station
 */
async function loadStationTransactions(stationId) {
  try {
    const response = await fetch(`/api/stations/${stationId}/transactions`);
    
    if (!response.ok) {
      throw new Error(`Failed to load station transactions: ${response.status}`);
    }
    
    const data = await response.json();
    renderStationTransactions(data.transactions);
    
  } catch (error) {
    console.error('Error loading station transactions:', error);
    document.getElementById('modal-transactions').innerHTML = 
      '<tr><td colspan="5">Failed to load transactions</td></tr>';
  }
}

/**
 * Render transactions for a station in the modal
 */
function renderStationTransactions(transactions) {
  const tbody = document.getElementById('modal-transactions');
  
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No transactions found</td></tr>';
    return;
  }
  
  tbody.innerHTML = '';
  
  transactions.forEach(tx => {
    const row = document.createElement('tr');
    
    // Calculate duration
    const duration = window.csmsUtils.calculateDuration(
      tx.startTimestamp, 
      tx.stopTimestamp
    );
    
    const durationText = duration ? 
      window.csmsUtils.formatDuration(duration) : '--';
    
    // Determine status
    let status = 'Active';
    let statusClass = 'transaction-active';
    
    if (tx.stopTimestamp) {
      status = 'Completed';
      statusClass = 'transaction-completed';
    }
    
    row.innerHTML = `
      <td>${tx.transactionId}</td>
      <td>${window.csmsUtils.formatDateTime(tx.startTimestamp)}</td>
      <td>${durationText}</td>
      <td>${tx.energyUsed ? (tx.energyUsed / 1000).toFixed(2) + ' kWh' : '--'}</td>
      <td class="${statusClass}">${status}</td>
    `;
    
    tbody.appendChild(row);
  });
}

// Export functions for global use
window.initStations = initStations;
window.updateStations = updateStations; 