// Load environment variables FIRST, before any other import
require('dotenv').config();

const validateEnv = require('./config/validateEnv');
validateEnv();

const express = require('express');
const config = require('./config');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend Running');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

app.listen(config.port, () => {
  console.log(`[${config.env}] Backend server is running on port ${config.port}`);
});
