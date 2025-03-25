/**
 * Transactions Module
 * Handles transaction listing, filtering, and details
 */

// DOM Elements
const transactionsTable = document.getElementById('transactions-table');
const transactionSearch = document.getElementById('transaction-search');
const transactionFilter = document.getElementById('transaction-filter');

// Module state
const transactionsState = {
  filter: {
    search: '',
    status: 'all'
  }
};

/**
 * Initialize transactions module
 */
function initTransactions(globalState) {
  // Set up event listeners
  setupTransactionEvents();
  
  // Render transactions
  renderTransactions(globalState.transactions);
}

/**
 * Update transactions when data changes
 */
function updateTransactions(globalState) {
  renderTransactions(globalState.transactions);
}

/**
 * Set up event listeners for transactions functionality
 */
function setupTransactionEvents() {
  // Search filter
  transactionSearch.addEventListener('input', e => {
    transactionsState.filter.search = e.target.value.toLowerCase();
    applyTransactionFilters();
  });
  
  // Status filter
  transactionFilter.addEventListener('change', e => {
    transactionsState.filter.status = e.target.value;
    applyTransactionFilters();
  });
}

/**
 * Apply filters to transactions
 */
function applyTransactionFilters() {
  // Get all transaction rows
  const rows = transactionsTable.querySelectorAll('tbody tr:not(.loading)');
  
  rows.forEach(row => {
    const stationId = row.getAttribute('data-station-id') || '';
    const idTag = row.getAttribute('data-id-tag') || '';
    const transactionId = row.getAttribute('data-transaction-id') || '';
    const status = row.getAttribute('data-status') || '';
    
    // Check if transaction matches search text
    const matchesSearch = transactionsState.filter.search === '' || 
      stationId.toLowerCase().includes(transactionsState.filter.search) || 
      idTag.toLowerCase().includes(transactionsState.filter.search) || 
      transactionId.includes(transactionsState.filter.search);
    
    // Check if transaction matches status filter
    let matchesStatus = true;
    if (transactionsState.filter.status === 'active') {
      matchesStatus = status === 'Active';
    } else if (transactionsState.filter.status === 'completed') {
      matchesStatus = status === 'Completed';
    }
    
    // Show/hide row based on filters
    if (matchesSearch && matchesStatus) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Render transactions to the table
 */
function renderTransactions(transactions) {
  const tbody = transactionsTable.querySelector('tbody');
  
  // Clear loading state
  if (tbody.querySelector('.loading')) {
    tbody.innerHTML = '';
  }
  
  if (!transactions || transactions.length === 0) {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = '<td colspan="8" class="no-data">No transactions found</td>';
    tbody.appendChild(noDataRow);
    return;
  }
  
  // Sort transactions by start time, newest first
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.startTimestamp) - new Date(a.startTimestamp);
  });
  
  // Create a document fragment to minimize DOM operations
  const fragment = document.createDocumentFragment();
  
  // Create rows for each transaction
  sortedTransactions.forEach(tx => {
    const row = createTransactionRow(tx);
    fragment.appendChild(row);
  });
  
  // Clear table and add new rows
  tbody.innerHTML = '';
  tbody.appendChild(fragment);
  
  // Apply current filters
  applyTransactionFilters();
}

/**
 * Create a table row for a transaction
 */
function createTransactionRow(transaction) {
  const row = document.createElement('tr');
  
  // Calculate duration
  const duration = window.csmsUtils.calculateDuration(
    transaction.startTimestamp, 
    transaction.stopTimestamp
  );
  
  const durationText = duration ? 
    window.csmsUtils.formatDuration(duration) : '--';
  
  // Determine status
  let status = 'Active';
  let statusClass = 'transaction-active';
  
  if (transaction.stopTimestamp) {
    status = 'Completed';
    statusClass = 'transaction-completed';
  }
  
  // Add data attributes for filtering
  row.setAttribute('data-transaction-id', transaction.transactionId);
  row.setAttribute('data-station-id', transaction.chargePointId);
  row.setAttribute('data-id-tag', transaction.idTag);
  row.setAttribute('data-status', status);
  
  // Set row content
  row.innerHTML = `
    <td>${transaction.transactionId}</td>
    <td>${transaction.chargePointId}</td>
    <td>${transaction.connectorId}</td>
    <td>${window.csmsUtils.formatDateTime(transaction.startTimestamp)}</td>
    <td>${durationText}</td>
    <td>${transaction.energyUsed ? (transaction.energyUsed / 1000).toFixed(2) + ' kWh' : '--'}</td>
    <td class="${statusClass}">${status}</td>
    <td>${transaction.idTag}</td>
  `;
  
  // Add event listener for row click to show details
  row.addEventListener('click', () => {
    showTransactionDetails(transaction);
  });
  
  return row;
}

/**
 * Show transaction details
 */
function showTransactionDetails(transaction) {
  // For now, just alert with transaction info
  // In a future enhancement, this could show a modal with detailed transaction information
  
  const energyUsed = transaction.energyUsed ? 
    (transaction.energyUsed / 1000).toFixed(2) + ' kWh' : 'Unknown';
  
  const duration = window.csmsUtils.calculateDuration(
    transaction.startTimestamp, 
    transaction.stopTimestamp
  );
  
  const durationText = duration ? 
    window.csmsUtils.formatDuration(duration) : 'In progress';
  
  const details = `
    Transaction #${transaction.transactionId}
    Station: ${transaction.chargePointId}
    Connector: ${transaction.connectorId}
    ID Tag: ${transaction.idTag}
    Started: ${window.csmsUtils.formatDateTime(transaction.startTimestamp)}
    ${transaction.stopTimestamp ? 'Ended: ' + window.csmsUtils.formatDateTime(transaction.stopTimestamp) : 'Still in progress'}
    Duration: ${durationText}
    Energy: ${energyUsed}
  `;
  
  alert(details);
}

// Export functions for global use
window.initTransactions = initTransactions;
window.updateTransactions = updateTransactions; 