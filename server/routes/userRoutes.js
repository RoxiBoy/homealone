const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Update last check-in time
router.post('/check-in', userController.updateCheckIn);

// Update check-in status
router.post('/check-in-status', userController.updateCheckInStatus);

module.exports = router;