const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get user profile
router.get('/profile', userController.getProfile);

// Dashboard overview
router.get('/dashboard', userController.getDashboard);

// Update user profile
router.put('/profile', userController.updateProfile);

// Register/update device FCM token
router.put('/device-token', userController.updateDeviceToken);

// Update last check-in time
router.post('/check-in', userController.updateCheckIn);

// Update check-in status
router.post('/check-in-status', userController.updateCheckInStatus);

// Update check-in settings (interval, countdown, DND)
router.put('/settings', userController.updateSettings);

// Reset/snooze check-in window after detecting recent device usage
router.post('/check-in-reset', userController.resetCheckInWindow);

// Report whether the app is actively being used (foreground/background)
router.post('/activity', userController.updateActivity);

// Send a basic FCM test notification to the current user
router.post('/test-notification', userController.sendTestNotification);

module.exports = router;
