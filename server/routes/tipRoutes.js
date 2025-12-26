const express = require('express');
const router = express.Router();
const tipController = require('../controllers/tipController');
const authMiddleware = require('../middleware/auth');

// Get all tips (public)
router.get('/', tipController.getTips);

// Get a specific tip (public)
router.get('/:id', tipController.getTip);

// Admin routes (protected)
router.use(authMiddleware);

// Create a new tip (admin only)
router.post('/', tipController.createTip);

// Update a tip (admin only)
router.put('/:id', tipController.updateTip);

// Delete a tip (admin only)
router.delete('/:id', tipController.deleteTip);

module.exports = router;