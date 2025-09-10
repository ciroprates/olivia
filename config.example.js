// Example configuration file
// Copy this file to config.js and replace with your own item IDs and settings
const banks = [
  {
    id: 'your-mercado-pago-item-id',  // Replace with your Mercado Pago item ID
    name: 'Mercado Pago'
  },
  {
    id: 'your-nubank-item-id',        // Replace with your Nubank item ID
    name: 'Nubank'
  }
];

// Default options for transaction fetching
const options = {
  excludeCategories: [
    'Same person transfer',
    'Credit card payment'
  ],
  startDate: null // Set to null to use automatic date detection, or specify a date in YYYY-MM-DD format
};

module.exports = { 
  banks,
  options 
}; 