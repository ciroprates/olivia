require('dotenv').config();

const { runTransactionExecution } = require('./jobs/transactionExecutionJob');

async function main() {
  try {
    await runTransactionExecution({}, () => {});
  } catch (error) {
    console.error('Erro:', error.message);
    process.exitCode = 1;
  }
}

main();
