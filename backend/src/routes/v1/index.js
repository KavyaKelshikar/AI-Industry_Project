const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const knowledgeSourceRoutes = require('./knowledgeSourceRoutes');
const documentRoutes = require('./documentRoutes');

const router = express.Router();

// Mount all v1 routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/knowledge-sources', knowledgeSourceRoutes);
router.use('/documents', documentRoutes);

module.exports = router;
