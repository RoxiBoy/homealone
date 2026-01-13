const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const checkInSessionController = require('../controllers/checkInSessionController');

// All routes require auth
router.use(authMiddleware);

// Start a new check-in session (would normally be called by server-side scheduler)
router.post('/start', checkInSessionController.startSession);

// Get latest active session (pending or emergency)
router.get('/active', checkInSessionController.getActiveSession);

// Respond: user is OK
router.post('/:id/ok', checkInSessionController.respondOk);

// Respond: emergency (user pressed "Not OK" or timeout)
router.post('/:id/emergency', checkInSessionController.respondEmergency);

module.exports = router;
