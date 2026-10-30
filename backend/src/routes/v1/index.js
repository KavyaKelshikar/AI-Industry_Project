const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const departmentRoutes = require('./departmentRoutes');
const roleRoutes = require('./roleRoutes');
const knowledgeSourceRoutes = require('./knowledgeSourceRoutes');
const documentRoutes = require('./documentRoutes');
const ragRoutes = require('./ragRoutes');
const chatRoutes = require('./chatRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const companyRoutes = require('./companyRoutes');

const router = express.Router();

// Mount all v1 routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/company', companyRoutes);
router.use('/departments', departmentRoutes);
router.use('/roles', roleRoutes);
router.use('/employees', employeeRoutes);
router.use('/knowledge-sources', knowledgeSourceRoutes);
router.use('/documents', documentRoutes);
router.use('/rag', ragRoutes);
router.use('/chat', chatRoutes);
router.use('/audit-logs', auditLogRoutes);

module.exports = router;

