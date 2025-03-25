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
      const connectorEl = createConnectorItem(connectorId, data, station.id);
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
    statusEl.className = 'station-status'; // Reset classes
    statusEl.classList.add(`status-${station.status || 'Unknown'}`);
  }
  
  // Update model/vendor if changed
  if (station.chargePointModel) {
    card.querySelector('.station-model').textContent = station.chargePointModel;
  }
  
  if (station.chargePointVendor) {
    card.querySelector('.station-vendor').textContent = station.chargePointVendor;
  }
  
  // Update heartbeat time
  if (station.lastHeartbeat) {
    card.querySelector('.station-heartbeat').textContent = 
      window.csmsUtils.formatDateTime(station.lastHeartbeat);
  }
  
  // Update connectors
  updateConnectorList(card, station);
}

/**
 * Update the connector list in a station card
 */
function updateConnectorList(card, station) {
  const connectorList = card.querySelector('.connector-list');
  
  // If no connectors yet, but now we have them
  if (connectorList.querySelector('.no-connectors') && 
      station.connectors && 
      Object.keys(station.connectors).length > 0) {
    // Clear and add connectors
    connectorList.innerHTML = '';
    Object.entries(station.connectors).forEach(([connectorId, data]) => {
      const connectorEl = createConnectorItem(connectorId, data, station.id);
      connectorList.appendChild(connectorEl);
    });
  } 
  // If we already have connector elements, update them
  else if (station.connectors && Object.keys(station.connectors).length > 0) {
    Object.entries(station.connectors).forEach(([connectorId, data]) => {
      let connectorEl = connectorList.querySelector(`.connector-item[data-connector-id="${connectorId}"]`);
      
      // If connector element doesn't exist, create it
      if (!connectorEl) {
        connectorEl = createConnectorItem(connectorId, data, station.id);
        connectorList.appendChild(connectorEl);
      } 
      // Otherwise update existing connector
      else {
        updateConnectorItem(connectorEl, data, station.id);
      }
    });
  }
}

/**
 * Create a connector item element
 */
function createConnectorItem(connectorId, data, stationId) {
  const template = connectorItemTemplate.content.cloneNode(true);
  const connectorEl = template.querySelector('.connector-item');
  
  // Set connector data attributes
  connectorEl.setAttribute('data-connector-id', connectorId);
  connectorEl.setAttribute('data-station-id', stationId);
  
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
  
  // If status is Preparing, show payment QR code
  if (data.status === 'Preparing') {
    // We call addPaymentQRCode after the element is fully created and in the DOM
    setTimeout(() => {
      addPaymentQRCode(connectorEl, stationId, connectorId);
    }, 0);
  }
  
  return connectorEl;
}

/**
 * Update an existing connector item element
 */
function updateConnectorItem(connectorEl, data, stationId) {
  // Update status if available
  if (data.status) {
    const statusEl = connectorEl.querySelector('.connector-status');
    const currentStatus = statusEl.textContent;
    
    if (currentStatus !== data.status) {
      statusEl.textContent = data.status;
      statusEl.className = 'connector-status'; // Reset classes
      statusEl.classList.add(`status-${data.status}`);
      
      // Add payment button when status changes to Preparing
      if (data.status === 'Preparing') {
        // Remove any existing payment button
        removePaymentButton(connectorEl);
        
        // Add payment button
        const payButton = document.createElement('button');
        payButton.className = 'payment-button';
        payButton.textContent = 'Pay to Start';
        payButton.addEventListener('click', () => {
          openStationDetails(globalState.stations.find(s => s.id === stationId));
          setTimeout(() => {
            // Switch to payment tab
            const paymentTab = document.querySelector('[data-tab="payment-tab"]');
            if (paymentTab) {
              paymentTab.click();
            }
            
            // Set connector selection in payment tab
            const connectorSelect = document.getElementById('payment-connector-select');
            if (connectorSelect) {
              connectorSelect.value = connectorEl.getAttribute('data-connector-id');
              // Trigger change event
              const event = new Event('change');
              connectorSelect.dispatchEvent(event);
            }
          }, 100);
        });
        
        connectorEl.appendChild(payButton);
      } else {
        // Remove payment button if status is not Preparing
        removePaymentButton(connectorEl);
      }
    }
  }
  
  // Update meter value and additional metrics if available
  const meterEl = connectorEl.querySelector('.connector-meter');
  
  // Clear previous data
  meterEl.innerHTML = '';
  
  if (data.meterValue) {
    // Primary energy value
    const value = data.meterValue.value || 0;
    const unit = data.meterValue.unit || 'Wh';
    
    const valueEl = document.createElement('span');
    valueEl.className = 'meter-value';
    valueEl.textContent = value;
    meterEl.appendChild(valueEl);
    
    meterEl.appendChild(document.createTextNode(' '));
    
    const unitEl = document.createElement('span');
    unitEl.className = 'meter-unit';
    unitEl.textContent = unit;
    meterEl.appendChild(unitEl);
    
    // Add additional metrics in a secondary row if available
    if (data.power || data.voltage || data.current) {
      const metricsContainer = document.createElement('div');
      metricsContainer.className = 'additional-metrics';
      
      const metrics = [];
      
      if (data.power) {
        metrics.push(`${data.power.value}${data.power.unit}`);
      }
      
      if (data.voltage) {
        metrics.push(`${data.voltage.value}${data.voltage.unit}`);
      }
      
      if (data.current) {
        metrics.push(`${data.current.value}${data.current.unit}`);
      }
      
      metricsContainer.textContent = metrics.join(' | ');
      meterEl.appendChild(metricsContainer);
    }
  } else {
    meterEl.textContent = 'No meter data';
  }
}

/**
 * Remove payment button from connector element
 */
function removePaymentButton(connectorEl) {
  const paymentButton = connectorEl.querySelector('.payment-button');
  if (paymentButton) {
    paymentButton.remove();
  }
}

/**
 * Add payment QR code to a connector element
 */
function addPaymentQRCode(connector, stationId, connectorId) {
    // No need to query for a child element, use the connector directly
    const connectorElement = connector;
    
    // Remove any existing payment UI
    const existingPayment = connector.querySelector('.payment-container');
    if (existingPayment) {
        existingPayment.remove();
    }
    
    // Create a simple payment QR code using data URI
    // This is a basic QR code pattern representing payment info
    const qrCode = generateSimpleQRCode(`payment:${stationId}:${connectorId}`);
    
    // Create payment container
    const paymentContainer = document.createElement('div');
    paymentContainer.className = 'payment-container';
    paymentContainer.innerHTML = `
        <div class="payment-header">
            <h3>Payment Required</h3>
            <p>Complete payment to start</p>
        </div>
        <div class="payment-qr">
            <img src="${qrCode}" alt="Payment QR Code" />
        </div>
        <div class="payment-info">
            <button class="payment-button">Complete Payment</button>
        </div>
    `;
    
    connectorElement.appendChild(paymentContainer);
    
    // Add event listener to the payment button
    const paymentButton = paymentContainer.querySelector('.payment-button');
    paymentButton.addEventListener('click', () => completePayment(stationId, connectorId));
}

/**
 * Generate a simple QR code pattern using data URI
 * This is a very basic implementation - in production you'd use a proper QR library
 */
function generateSimpleQRCode(data) {
    // Create a simple pattern based on the data string
    // This is not an actual QR code, just a visual representation
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 100, 100);
    
    // Draw border
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 100, 10);
    ctx.fillRect(0, 0, 10, 100);
    ctx.fillRect(90, 0, 10, 100);
    ctx.fillRect(0, 90, 100, 10);
    
    // Draw finder patterns (the three large squares in corners)
    drawFinderPattern(ctx, 15, 15);
    drawFinderPattern(ctx, 15, 60);
    drawFinderPattern(ctx, 60, 15);
    
    // Draw some data patterns based on the string
    for (let i = 0; i < data.length; i++) {
        const x = (i % 6) * 7 + 30;
        const y = Math.floor(i / 6) * 7 + 30;
        const charCode = data.charCodeAt(i);
        
        if (charCode % 2) {
            ctx.fillRect(x, y, 5, 5);
        }
    }
    
    // Return as data URI
    return canvas.toDataURL('image/png');
}

/**
 * Draw QR code finder pattern
 */
function drawFinderPattern(ctx, x, y) {
    ctx.fillStyle = 'black';
    ctx.fillRect(x, y, 20, 20);
    
    ctx.fillStyle = 'white';
    ctx.fillRect(x + 4, y + 4, 12, 12);
    
    ctx.fillStyle = 'black';
    ctx.fillRect(x + 7, y + 7, 6, 6);
}

/**
 * Remove payment QR code from connector element
 */
function removePaymentQRCode(connectorEl) {
  const paymentContainer = connectorEl.querySelector('.payment-container');
  if (paymentContainer) {
    paymentContainer.remove();
  }
}

/**
 * Handle payment completion
 */
function completePayment(stationId, connectorId) {
    // Find the connector element with the correct data attributes
    const connectorElement = document.querySelector(`.connector-item[data-connector-id="${connectorId}"][data-station-id="${stationId}"]`);
    
    if (!connectorElement) {
        console.error(`Connector element not found for station ${stationId}, connector ${connectorId}`);
        return;
    }
    
    const paymentContainer = connectorElement.querySelector('.payment-container');
    
    if (paymentContainer) {
        paymentContainer.innerHTML = `
            <div class="payment-header">
                <h3>Processing</h3>
                <p>Please wait...</p>
            </div>
            <div class="payment-loading">
                <div class="spinner"></div>
            </div>
        `;
    }
    
    // Generate a fake payment ID for demo
    const paymentId = 'pm_' + Math.random().toString(36).substring(2, 10);
    
    // Make API request to complete payment
    fetch('/api/payment/complete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            stationId: stationId,
            connectorId: connectorId,
            paymentId: paymentId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Payment processing failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Payment succeeded
            if (paymentContainer) {
                paymentContainer.innerHTML = `
                    <div class="payment-header">
                        <h3>Payment Successful</h3>
                        <p>Starting charging...</p>
                    </div>
                    <div class="payment-success">
                        <svg viewBox="0 0 24 24" width="30" height="30">
                            <path fill="green" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
                        </svg>
                    </div>
                `;
                
                // Remove payment container after 2 seconds
                setTimeout(() => {
                    if (paymentContainer.parentElement) {
                        paymentContainer.remove();
                    }
                }, 2000);
            }
        }
    })
    .catch(error => {
        console.error('Payment error:', error);
        if (paymentContainer) {
            paymentContainer.innerHTML = `
                <div class="payment-header">
                    <h3>Payment Failed</h3>
                    <p>Try again</p>
                </div>
                <div class="payment-error">
                    <svg viewBox="0 0 24 24" width="30" height="30">
                        <path fill="red" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                    </svg>
                </div>
                <button class="payment-button">Try Again</button>
            `;
            
            // Add event listener to the try again button
            const retryButton = paymentContainer.querySelector('.payment-button');
            if (retryButton) {
                retryButton.addEventListener('click', () => completePayment(stationId, connectorId));
            }
        }
    });
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
  
  // Populate payment tab
  updatePaymentTab(station);
  
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
  
  // Update payment tab if it's active
  if (document.getElementById('payment-tab').classList.contains('active')) {
    updatePaymentTab(station);
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

/**
 * Update the payment tab with station connector data
 */
function updatePaymentTab(station) {
  const paymentTab = document.getElementById('payment-tab');
  
  // Clear existing content
  paymentTab.innerHTML = '';
  
  // Check if station has any connectors in Preparing state
  const preparingConnectors = [];
  if (station.connectors) {
    Object.entries(station.connectors).forEach(([connectorId, data]) => {
      if (data.status === 'Preparing') {
        preparingConnectors.push({ id: connectorId, data });
      }
    });
  }
  
  if (preparingConnectors.length === 0) {
    // No connectors in Preparing state
    paymentTab.innerHTML = `
      <div class="payment-status">
        <p>No connectors ready for payment</p>
        <p>Connect a vehicle to a connector to initiate payment.</p>
      </div>
    `;
    return;
  }
  
  // Create payment form
  const paymentForm = document.createElement('div');
  paymentForm.className = 'payment-form';
  
  // Connector selection
  const connectorSelect = document.createElement('select');
  connectorSelect.id = 'payment-connector-select';
  connectorSelect.className = 'payment-connector-select';
  
  preparingConnectors.forEach(connector => {
    const option = document.createElement('option');
    option.value = connector.id;
    option.textContent = `Connector ${connector.id}`;
    connectorSelect.appendChild(option);
  });
  
  // Listen for connector selection changes
  connectorSelect.addEventListener('change', () => {
    const selectedConnectorId = connectorSelect.value;
    updatePaymentQRCode(station.id, selectedConnectorId);
  });
  
  // Payment header
  const paymentHeader = document.createElement('div');
  paymentHeader.className = 'payment-header-large';
  paymentHeader.innerHTML = `
    <h3>Payment Required</h3>
    <p>Select connector and complete payment to start charging</p>
    <div class="connector-selection">
      <label for="payment-connector-select">Connector:</label>
    </div>
  `;
  paymentHeader.querySelector('.connector-selection').appendChild(connectorSelect);
  
  // Payment QR container
  const qrContainer = document.createElement('div');
  qrContainer.id = 'payment-qr-container';
  qrContainer.className = 'payment-qr-large';
  
  // Payment button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'payment-actions';
  
  const paymentButton = document.createElement('button');
  paymentButton.className = 'payment-button-large';
  paymentButton.textContent = 'Complete Payment';
  paymentButton.addEventListener('click', () => {
    completePayment(station.id, connectorSelect.value);
  });
  
  buttonContainer.appendChild(paymentButton);
  
  // Assemble payment form
  paymentForm.appendChild(paymentHeader);
  paymentForm.appendChild(qrContainer);
  paymentForm.appendChild(buttonContainer);
  
  paymentTab.appendChild(paymentForm);
  
  // Generate QR code for the first connector
  updatePaymentQRCode(station.id, preparingConnectors[0].id);
}

/**
 * Update payment QR code in the modal
 */
function updatePaymentQRCode(stationId, connectorId) {
  const qrContainer = document.getElementById('payment-qr-container');
  if (!qrContainer) return;
  
  // Clear existing content
  qrContainer.innerHTML = '';
  
  // Create Stripe test payment URL
  const stripeSessionData = {
    stationId,
    connectorId,
    timestamp: Date.now()
  };
  
  // In a real implementation, you'd create a Stripe Checkout session and get the URL
  // For now, we'll create a dummy URL with the session data encoded
  const stripeUrl = `https://checkout.stripe.com/pay/cs_test_${btoa(JSON.stringify(stripeSessionData)).replace(/=/g, '')}`;
  
  // Create QR code element
  const qrCodeElement = document.createElement('div');
  qrCodeElement.id = 'qrcode';
  qrContainer.appendChild(qrCodeElement);
  
  // Add loading indicator
  const loadingEl = document.createElement('div');
  loadingEl.className = 'qr-loading';
  loadingEl.innerHTML = '<div class="spinner"></div><p>Generating QR code...</p>';
  qrContainer.appendChild(loadingEl);
  
  // Add URL display
  const urlDisplay = document.createElement('div');
  urlDisplay.className = 'payment-url';
  urlDisplay.innerHTML = `
    <p>Or use this payment link:</p>
    <a href="${stripeUrl}" target="_blank">${stripeUrl.substring(0, 40)}...</a>
  `;
  qrContainer.appendChild(urlDisplay);
  
  // Try to load QRCode.js
  try {
    // Use our built-in QR code generator if external library fails
    const qrImage = generateSimplePaymentQRCode(stripeUrl);
    loadingEl.style.display = 'none';
    qrCodeElement.innerHTML = `<img src="${qrImage}" alt="Payment QR Code" width="200" height="200">`;
  } catch (error) {
    console.error('Error generating QR code:', error);
    loadingEl.innerHTML = '<p>Could not generate QR code. Please use the payment link below.</p>';
  }
}

/**
 * Generate a payment QR code for Stripe checkout
 * This is a fallback method when the external QR code library fails to load
 */
function generateSimplePaymentQRCode(url) {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 200, 200);
  
  // Draw a border
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 180, 180);
  
  // Draw a Stripe-like logo in the center
  ctx.fillStyle = '#3498db';
  ctx.fillRect(60, 85, 80, 30);
  
  // Draw text labels
  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Stripe Payment', 100, 60);
  ctx.font = '14px Arial';
  ctx.fillText(stationsState.selectedStation?.id || 'Station', 100, 140);
  ctx.fillText(`Connector ${url.split('connectorId')[1].charAt(3)}`, 100, 160);
  
  // Return the data URL
  return canvas.toDataURL('image/png');
}

// Export functions for global use
window.initStations = initStations;
window.updateStations = updateStations; 