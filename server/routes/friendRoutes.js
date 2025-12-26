const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all friends
router.get('/', friendController.getFriends);

// Add a new friend
router.post('/', friendController.addFriend);

// Update a friend
router.put('/:id', friendController.updateFriend);

// Delete a friend
router.delete('/:id', friendController.deleteFriend);

module.exports = router;