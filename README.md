# Olivia - Financial Transactions Manager

A Node.js application that fetches, processes, and exports financial transactions from multiple banking institutions using the Pluggy API. The application supports automatic transaction deduplication and exports data to CSV format, with optional upload to AWS S3.

## ✨ Features

- **Multi-bank Support**: Fetch transactions from multiple banking institutions simultaneously
- **Transaction Filtering**: Exclude specific transaction categories (e.g., transfers, credit card payments)
- **Smart Date Handling**: Automatically fetches only new transactions based on last update
- **CSV Export**: Exports transactions to a well-formatted CSV file
- **S3 Integration**: Optional upload of generated CSV to AWS S3
- **Incremental Updates**: Only processes new transactions on subsequent runs

## 🚀 Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- Pluggy API credentials
- (Optional) AWS credentials for S3 upload

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/olivia.git
cd olivia
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your credentials:
```
# Required
PLUGGY_CLIENT_ID=your_pluggy_client_id
PLUGGY_CLIENT_SECRET=your_pluggy_client_secret

# Optional - AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=sa-east-1
S3_BUCKET=your-bucket-name
```

5. Configure your banks by creating a `config.js` file based on the example:
```bash
cp config.example.js config.js
```

6. Edit the `config.js` file with your bank configurations.


## 🛠 Usage

### Basic Usage

```bash
node src/index.js
```



### Output

The application will:
1. Connect to each configured bank
2. Fetch new transactions
3. Generate a CSV file in the `output` directory
4. (Optional) Upload the file to S3

## 📁 Project Structure

```
olivia/
├── src/
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   ├── constants.js    # Application constants
│   └── index.js        # Entry point
├── config.js           # Bank configurations (create from config.example.js)
├── config.example.js   # Example configuration
├── .env                # Environment variables (create from .env.example)
└── output/             # Generated CSV files
```

## 🔒 Security Note

This application handles sensitive financial information. Please ensure you:

- Never commit your `.env` file
- Never commit your `config.js` file (only commit `config.example.js`)
- Keep your API credentials secure
- Use environment variables for sensitive data
- Regularly rotate your API keys
- The `.gitignore` file is pre-configured to exclude sensitive files

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Pluggy](https://pluggy.ai/) for the financial data API
- All contributors who have helped improve this project