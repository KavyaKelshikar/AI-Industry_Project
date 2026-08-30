/**
 * Health controller.
 *
 * GET /api/v1/health — returns the aggregate health of the platform
 * including backend, MongoDB, ChromaDB, uptime, and application version.
 * No authentication required.
 */

const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');
const { verifyChromaConnection } = require('../config/chromadb');
const aiServiceClient = require('../services/aiServiceClient');
const { successResponse } = require('../utils/responseHelper');

/**
 * Map Mongoose readyState integers to human-readable status strings.
 */
const MONGO_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * GET /api/v1/health
 *
 * Returns:
 *  - status            : overall health ("healthy" | "degraded")
 *  - version           : application version from package.json
 *  - environment       : current NODE_ENV
 *  - uptime            : process uptime in seconds
 *  - timestamp         : ISO-8601 server time
 *  - services.backend  : always "up" if this handler executes
 *  - services.mongodb  : live readyState from Mongoose
 *  - services.chromadb : live heartbeat check
 *  - services.aiService: live AI service probe
 */
const checkHealth = async (req, res) => {
  // ── MongoDB status ──
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = MONGO_STATES[mongoState] || 'unknown';

  // ── ChromaDB status (heartbeat) ──
  let chromaStatus = 'disconnected';
  try {
    const isConnected = await verifyChromaConnection();
    chromaStatus = isConnected ? 'connected' : 'disconnected';
  } catch (err) {
    logger.error(`Health check — ChromaDB probe failed: ${err.message}`);
    chromaStatus = 'error';
  }

  // ── AI Service status (HTTP probe) ──
  let aiServiceStatus = 'down';
  try {
    const aiHealth = await aiServiceClient.checkHealth(1500);
    aiServiceStatus = aiHealth.ok ? 'up' : 'down';
  } catch (err) {
    logger.error(`Health check — AI Service probe failed: ${err.message}`);
    aiServiceStatus = 'error';
  }

  // ── Aggregate status ──
  const allHealthy =
    mongoStatus === 'connected' &&
    chromaStatus === 'connected' &&
    aiServiceStatus === 'up';

  const healthData = {
    status: allHealthy ? 'healthy' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      backend: 'up',
      mongodb: mongoStatus,
      chromadb: chromaStatus,
      aiService: aiServiceStatus,
    },
  };

  logger.info('Health check completed', { status: healthData.status, services: healthData.services });

  return successResponse(
    res,
    healthData,
    allHealthy ? 'Service is healthy' : 'Service is degraded'
  );
};

module.exports = { checkHealth };
