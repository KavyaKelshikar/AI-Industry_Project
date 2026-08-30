/**
 * ChromaDB configuration module.
 *
 * Provides a configured ChromaDB client instance.
 * Collections are NOT created here — they belong in a later phase.
 */

const { ChromaClient } = require('chromadb');
const config = require('./index');
const logger = require('../utils/logger');

let chromaClient = null;

/**
 * Returns a singleton ChromaDB client configured from environment variables.
 * The client is lazily initialised on first call.
 */
const getChromaClient = () => {
  if (!chromaClient) {
    chromaClient = new ChromaClient({
      host: config.chromadb.host,
      port: config.chromadb.port,
    });
    logger.info(`ChromaDB client configured for ${config.chromadb.host}:${config.chromadb.port}`);
  }
  return chromaClient;
};

/**
 * Verify ChromaDB connectivity by calling the heartbeat endpoint.
 * Returns true on success, false on failure.
 */
const verifyChromaConnection = async () => {
  try {
    const client = getChromaClient();
    await client.heartbeat();
    logger.info('ChromaDB connection verified (heartbeat OK)');
    return true;
  } catch (error) {
    logger.error(`ChromaDB connection failed: ${error.message}`);
    return false;
  }
};

module.exports = { getChromaClient, verifyChromaConnection };
