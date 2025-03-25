/**
 * Analytics Module
 * Handles charts and analytics data visualization
 */

// Chart instances
let energyChart;
let utilizationChart;
let statusChart;

// DOM Elements
const avgDurationEl = document.getElementById('avg-duration');
const avgEnergyEl = document.getElementById('avg-energy');
const totalSessionsEl = document.getElementById('total-sessions');
const peakTimeEl = document.getElementById('peak-time');

/**
 * Initialize analytics module
 */
function initAnalytics(globalState) {
  // Wait for Chart.js to load
  if (typeof Chart === 'undefined') {
    // Wait up to 5 seconds for Chart.js to load
    const startTime = Date.now();
    const waitForChart = setInterval(() => {
      if (typeof Chart !== 'undefined') {
        // Chart loaded, clear interval and initialize
        clearInterval(waitForChart);
        initializeCharts(globalState);
      } else if (Date.now() - startTime > 5000) {
        // Timeout after 5 seconds
        clearInterval(waitForChart);
        console.error('Chart.js failed to load within timeout period. Charts will not be displayed.');
        displayChartError();
        updateMetrics(globalState);
      }
    }, 500);
    
    // Display message while waiting
    displayLoadingMessage();
    
    // Update metrics anyways
    updateMetrics(globalState);
  } else {
    // Chart.js already loaded, initialize charts
    initializeCharts(globalState);
  }
}

/**
 * Initialize the charts once Chart.js is loaded
 */
function initializeCharts(globalState) {
  try {
    createEnergyChart();
    createUtilizationChart();
    createStatusChart();
    
    // Update data
    updateAnalytics(globalState);
  } catch (error) {
    console.error('Error initializing charts:', error);
    displayChartError();
    updateMetrics(globalState);
  }
}

/**
 * Display loading message while waiting for Chart.js
 */
function displayLoadingMessage() {
  document.querySelectorAll('.chart-container').forEach(container => {
    const canvas = container.querySelector('canvas');
    if (canvas) {
      // Hide the canvas temporarily
      canvas.style.display = 'none';
      
      // Create loading message
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'chart-loading';
      loadingMsg.innerHTML = 'Loading charts...';
      loadingMsg.style.padding = '2rem';
      loadingMsg.style.textAlign = 'center';
      loadingMsg.style.color = '#3498db';
      
      // Add loading message to container
      container.appendChild(loadingMsg);
    }
  });
}

/**
 * Display error message when charts can't be displayed
 */
function displayChartError() {
  document.querySelectorAll('.chart-container').forEach(container => {
    // Remove any loading messages
    const loadingMsg = container.querySelector('.chart-loading');
    if (loadingMsg) {
      container.removeChild(loadingMsg);
    }
    
    const canvas = container.querySelector('canvas');
    if (canvas) {
      // Hide the canvas
      canvas.style.display = 'none';
      
      // Create error message
      const errorMsg = document.createElement('div');
      errorMsg.className = 'chart-error';
      errorMsg.innerHTML = 'Charts could not be loaded. Please check your internet connection.';
      errorMsg.style.padding = '2rem';
      errorMsg.style.textAlign = 'center';
      errorMsg.style.color = '#e74c3c';
      
      // Add error message to container
      container.appendChild(errorMsg);
    }
  });
}

/**
 * Update analytics when data changes
 */
function updateAnalytics(globalState) {
  if (typeof Chart === 'undefined') {
    // Only update metrics if Chart.js is not available
    updateMetrics(globalState);
    return;
  }

  updateCharts(globalState);
  updateMetrics(globalState);
}

/**
 * Update all charts with new data
 */
function updateCharts(globalState) {
  if (energyChart) updateEnergyChart(globalState);
  if (utilizationChart) updateUtilizationChart(globalState);
  if (statusChart) updateStatusChart(globalState);
}

/**
 * Create the energy consumption chart
 */
function createEnergyChart() {
  const ctx = document.getElementById('energy-chart');
  if (!ctx) {
    console.error('Energy chart canvas not found');
    return;
  }

  energyChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Energy Consumption (kWh)',
        data: [],
        fill: true,
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgba(52, 152, 219, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Energy (kWh)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      }
    }
  });
}

/**
 * Update the energy consumption chart
 */
function updateEnergyChart(globalState) {
  if (!energyChart) return;
  
  // Extract completed transactions
  const completedTransactions = globalState.transactions.filter(tx => tx.stopTimestamp);
  
  // Group transactions by date
  const energyByDate = groupTransactionsByDate(completedTransactions);
  
  // Prepare data for chart
  const labels = [];
  const data = [];
  
  // Get the last 7 days of data
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    labels.push(dateString);
    
    // Get energy for this date
    const dateKey = date.toISOString().split('T')[0];
    const energy = energyByDate[dateKey] || 0;
    data.push(energy);
  }
  
  // Update chart data
  energyChart.data.labels = labels;
  energyChart.data.datasets[0].data = data;
  energyChart.update();
}

/**
 * Create the station utilization chart
 */
function createUtilizationChart() {
  const ctx = document.getElementById('utilization-chart');
  if (!ctx) {
    console.error('Utilization chart canvas not found');
    return;
  }
  
  utilizationChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Station Utilization (Hours)',
        data: [],
        backgroundColor: 'rgba(46, 204, 113, 0.7)',
        borderColor: 'rgba(46, 204, 113, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Utilization (Hours)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Station'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      }
    }
  });
}

/**
 * Update the station utilization chart
 */
function updateUtilizationChart(globalState) {
  if (!utilizationChart) return;
  
  // Calculate utilization per station
  const stationUtilization = calculateStationUtilization(globalState.transactions);
  
  // Sort stations by utilization (descending)
  const sortedStations = Object.entries(stationUtilization)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10 stations
  
  // Prepare data for chart
  const labels = sortedStations.map(([station]) => station);
  const data = sortedStations.map(([, hours]) => hours);
  
  // Update chart data
  utilizationChart.data.labels = labels;
  utilizationChart.data.datasets[0].data = data;
  utilizationChart.update();
}

/**
 * Create the status distribution chart
 */
function createStatusChart() {
  const ctx = document.getElementById('status-chart');
  if (!ctx) {
    console.error('Status chart canvas not found');
    return;
  }
  
  statusChart = new Chart(ctx.getContext('2d'), {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          'rgba(46, 204, 113, 0.7)',  // Available
          'rgba(52, 152, 219, 0.7)',  // Charging
          'rgba(231, 76, 60, 0.7)',   // Faulted
          'rgba(149, 165, 166, 0.7)',  // Unavailable
          'rgba(243, 156, 18, 0.7)'   // Other
        ],
        borderColor: [
          'rgba(46, 204, 113, 1)',
          'rgba(52, 152, 219, 1)',
          'rgba(231, 76, 60, 1)',
          'rgba(149, 165, 166, 1)',
          'rgba(243, 156, 18, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Update the status distribution chart
 */
function updateStatusChart(globalState) {
  if (!statusChart) return;
  
  // Count stations by status
  const statusCounts = {
    'Available': 0,
    'Charging': 0,
    'Faulted': 0,
    'Unavailable': 0,
    'Other': 0
  };
  
  globalState.stations.forEach(station => {
    const status = station.status || 'Unknown';
    
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    } else {
      statusCounts['Other']++;
    }
  });
  
  // Prepare data for chart
  const labels = Object.keys(statusCounts);
  const data = Object.values(statusCounts);
  
  // Update chart data
  statusChart.data.labels = labels;
  statusChart.data.datasets[0].data = data;
  statusChart.update();
}

/**
 * Update metrics displayed in the metrics card
 */
function updateMetrics(globalState) {
  // Calculate average duration
  const completedTransactions = globalState.transactions.filter(tx => tx.stopTimestamp);
  
  if (completedTransactions.length > 0) {
    // Average duration
    const totalDuration = completedTransactions.reduce((sum, tx) => {
      const duration = new Date(tx.stopTimestamp) - new Date(tx.startTimestamp);
      return sum + duration;
    }, 0);
    
    const avgDurationMs = totalDuration / completedTransactions.length;
    avgDurationEl.textContent = window.csmsUtils.formatDuration(avgDurationMs);
    
    // Average energy
    const totalEnergy = completedTransactions.reduce((sum, tx) => {
      return sum + (tx.energyUsed || 0);
    }, 0);
    
    const avgEnergyKwh = (totalEnergy / completedTransactions.length) / 1000;
    avgEnergyEl.textContent = `${avgEnergyKwh.toFixed(2)} kWh`;
    
    // Total sessions today
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = globalState.transactions.filter(tx => {
      return tx.startTimestamp && tx.startTimestamp.startsWith(today);
    });
    
    totalSessionsEl.textContent = todayTransactions.length;
    
    // Peak usage time
    const peakHour = calculatePeakHour(globalState.transactions);
    peakTimeEl.textContent = peakHour;
  } else {
    // No completed transactions
    avgDurationEl.textContent = '0 min';
    avgEnergyEl.textContent = '0 kWh';
    totalSessionsEl.textContent = '0';
    peakTimeEl.textContent = '--';
  }
}

/**
 * Group transactions by date and calculate total energy
 */
function groupTransactionsByDate(transactions) {
  const energyByDate = {};
  
  transactions.forEach(tx => {
    if (!tx.energyUsed) return;
    
    // Extract date part
    const date = tx.startTimestamp.split('T')[0];
    
    // Add energy to date
    if (!energyByDate[date]) {
      energyByDate[date] = 0;
    }
    
    energyByDate[date] += tx.energyUsed / 1000; // Convert to kWh
  });
  
  return energyByDate;
}

/**
 * Calculate station utilization in hours
 */
function calculateStationUtilization(transactions) {
  const stationUtilization = {};
  
  transactions.forEach(tx => {
    if (!tx.chargePointId) return;
    
    // Calculate duration in hours
    const startTime = new Date(tx.startTimestamp);
    const endTime = tx.stopTimestamp ? new Date(tx.stopTimestamp) : new Date();
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);
    
    // Add duration to station
    if (!stationUtilization[tx.chargePointId]) {
      stationUtilization[tx.chargePointId] = 0;
    }
    
    stationUtilization[tx.chargePointId] += durationHours;
  });
  
  // Round values to 1 decimal place
  Object.keys(stationUtilization).forEach(station => {
    stationUtilization[station] = parseFloat(stationUtilization[station].toFixed(1));
  });
  
  return stationUtilization;
}

/**
 * Calculate the peak usage hour
 */
function calculatePeakHour(transactions) {
  // Count transactions by hour of day
  const hourCounts = new Array(24).fill(0);
  
  transactions.forEach(tx => {
    if (!tx.startTimestamp) return;
    const hour = new Date(tx.startTimestamp).getHours();
    hourCounts[hour]++;
  });
  
  // Find peak hour
  let peakHour = 0;
  let peakCount = 0;
  
  hourCounts.forEach((count, hour) => {
    if (count > peakCount) {
      peakHour = hour;
      peakCount = count;
    }
  });
  
  // Format peak hour
  const formattedHour = new Date(2000, 0, 1, peakHour).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  return peakCount > 0 ? formattedHour : '--';
}

// Export functions for global use
window.initAnalytics = initAnalytics;
window.updateAnalytics = updateAnalytics; 