# Olivia - Financial Transactions Viewer

A Node.js application that fetches and displays financial transactions from multiple banking institutions using the Pluggy API.

## Features

- Fetches transactions from multiple banking institutions
- Supports both bank accounts and credit cards
- Exports transactions to CSV format



## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your Pluggy API credentials:
```
PLUGGY_CLIENT_ID=your_client_id
PLUGGY_CLIENT_SECRET=your_client_secret
```

4. Create a `config.js` file with your bank configurations:
```javascript
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

module.exports = { banks };
```

5. Run the application:
```bash
node index.js
```

## Dependencies

- dotenv: For environment variable management
- pluggy-sdk: For interacting with the Pluggy API

## Security Note

This application requires sensitive information to run:
- Pluggy API credentials (client ID and secret)
- Item IDs for each connected account

Make sure to:
- Never commit your `.env` file
- Never commit your `config.js` file
- Keep your API credentials secure

## License

MIT 