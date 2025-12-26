const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all reminders
router.get('/', reminderController.getReminders);

// Get a specific reminder
router.get('/:id', reminderController.getReminder);

// Create a new reminder
router.post('/', reminderController.createReminder);

// Update a reminder
router.put('/:id', reminderController.updateReminder);

// Delete a reminder
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;