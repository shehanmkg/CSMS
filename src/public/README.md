# CSMS Dashboard

This is the frontend dashboard for the Charging Station Management System (CSMS). It provides real-time monitoring and analytics for EV charging stations.

## Features

- **Station Monitoring**: View real-time status of all charging stations
- **Transaction Tracking**: Monitor ongoing and completed charging sessions
- **Analytics**: View energy consumption, station utilization, and other metrics
- **Filtering and Search**: Easily find specific stations or transactions

## Technical Details

The dashboard is built with vanilla JavaScript and uses the following libraries:

- **Chart.js**: For data visualization and analytics
- **Fetch API**: For retrieving data from the backend
- **CSS Grid/Flexbox**: For responsive layout

## Usage

The dashboard automatically refreshes data every 10 seconds to show the latest information from charging stations. You can:

1. View all stations and their current status
2. Filter stations by status or search for specific stations
3. View all charging transactions
4. Filter transactions by status or search for specific transactions
5. View analytics on energy consumption and station utilization

## Development

To modify or extend the dashboard:

1. The main HTML is in `index.html`
2. Styles are in `css/styles.css`
3. JavaScript modules:
   - `js/dashboard.js` - Core functionality and state management
   - `js/stations.js` - Station listing and details
   - `js/transactions.js` - Transaction listing and details
   - `js/analytics.js` - Charts and analytics

## Integration with CSMS Backend

The dashboard connects to the following backend API endpoints:

- `/api/stations` - Get all charging stations
- `/api/transactions` - Get all transactions
- `/api/stations/:chargePointId/transactions` - Get transactions for a specific station 