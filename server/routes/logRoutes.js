const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/client-log', logController.receiveClientLog);

module.exports = router;
