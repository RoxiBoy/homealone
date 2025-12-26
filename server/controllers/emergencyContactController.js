const EmergencyContact = require('../models/Emergency-contact');

// Get emergency contact for a user
exports.getEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findOne({ user: req.userId });
    
    if (!contact) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }
    
    res.status(200).json(contact);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching emergency contact',
      error: error.message,
    });
  }
};

// Create emergency contact
exports.createEmergencyContact = async (req, res) => {
  try {
    const { name, phone, relationship, address, notes } = req.body;
    
    // Check if user already has an emergency contact
    const existingContact = await EmergencyContact.findOne({ user: req.userId });
    
    if (existingContact) {
      return res.status(400).json({ 
        message: 'Emergency contact already exists. Use PUT to update.' 
      });
    }
    
    const contact = new EmergencyContact({
      user: req.userId,
      name,
      phone,
      relationship,
      address,
      notes,
    });
    
    await contact.save();
    
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({
      message: 'Error creating emergency contact',
      error: error.message,
    });
  }
};

// Update emergency contact
exports.updateEmergencyContact = async (req, res) => {
  try {
    const { name, phone, relationship, address, notes } = req.body;
    
    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { name, phone, relationship, address, notes },
      { new: true, runValidators: true }
    );
    
    if (!contact) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }
    
    res.status(200).json(contact);
  } catch (error) {
    res.status(500).json({
      message: 'Error updating emergency contact',
      error: error.message,
    });
  }
};

// Delete emergency contact
exports.deleteEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }
    
    res.status(200).json({ message: 'Emergency contact deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting emergency contact',
      error: error.message,
    });
  }
};