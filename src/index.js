require('dotenv').config();

const { runTransactionExecution } = require('./jobs/transactionExecutionJob');
const { logMissingEnvVars } = require('./utils/envUtils');

logMissingEnvVars();

async function main() {
  try {
    await runTransactionExecution({}, () => {});
  } catch (error) {
    console.error('Erro:', error.message);
    process.exitCode = 1;
  }
}

main();
