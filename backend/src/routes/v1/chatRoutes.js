const express = require('express');
const chatController = require('../../controllers/chatController');
const { authenticate } = require('../../middlewares/auth');
const { enforceTenantScope } = require('../../middlewares/tenant');

const router = express.Router();

router.use(authenticate);
router.use(enforceTenantScope);

router.post('/sessions', chatController.createSession);
router.get('/sessions', chatController.listSessions);
router.get('/sessions/:id', chatController.getSession);
router.post('/sessions/:id/messages', chatController.sendMessage);
router.delete('/sessions/:id', chatController.deleteSession);

module.exports = router;
