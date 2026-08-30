const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const config = require('./config');
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const v1Router = require('./routes/v1');

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors(config.cors));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use(requestLogger);

// Default test route
app.get('/', (req, res) => {
  res.send('Backend Running');
});

// API v1 Routing
app.use('/api/v1', v1Router);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
