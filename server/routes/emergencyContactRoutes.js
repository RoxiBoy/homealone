const express = require('express');
const router = express.Router();
const emergencyContactController = require('../controllers/emergencyContactController');
const authMiddleware = require('../middleware/auth')

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get emergency contact
router.get('/', emergencyContactController.getEmergencyContact);

// Create emergency contact
router.post('/', emergencyContactController.createEmergencyContact);

// Update emergency contact
router.put('/:id', emergencyContactController.updateEmergencyContact);

// Delete emergency contact
router.delete('/:id', emergencyContactController.deleteEmergencyContact);

module.exports = router;