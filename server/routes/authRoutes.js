const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Register a new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Logout user (accepts a signed expired token so cleanup still succeeds)
router.post('/logout', authMiddleware.allowExpired, authController.logout);

module.exports = router;
