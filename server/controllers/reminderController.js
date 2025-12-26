const Reminder = require('../models/Reminder');

// Get all reminders for a user
exports.getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ 
      user: req.userId,
      isActive: true,
    });
    
    res.status(200).json(reminders);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching reminders',
      error: error.message,
    });
  }
};

// Get a specific reminder
exports.getReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.userId,
    });
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    res.status(200).json(reminder);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching reminder',
      error: error.message,
    });
  }
};

// Create a new reminder
exports.createReminder = async (req, res) => {
  try {
    const {
      title,
      type,
      dosage,
      frequency,
      time,
      date,
      address,
      notes,
    } = req.body;
    
    const reminder = new Reminder({
      user: req.userId,
      title,
      type,
      dosage,
      frequency,
      time,
      date,
      address,
      notes,
    });
    
    await reminder.save();
    
    res.status(201).json(reminder);
  } catch (error) {
    res.status(500).json({
      message: 'Error creating reminder',
      error: error.message,
    });
  }
};

// Update a reminder
exports.updateReminder = async (req, res) => {
  try {
    const {
      title,
      type,
      dosage,
      frequency,
      time,
      date,
      address,
      notes,
    } = req.body;
    
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      {
        title,
        type,
        dosage,
        frequency,
        time,
        date,
        address,
        notes,
      },
      { new: true, runValidators: true }
    );
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    res.status(200).json(reminder);
  } catch (error) {
    res.status(500).json({
      message: 'Error updating reminder',
      error: error.message,
    });
  }
};

// Delete a reminder (soft delete)
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isActive: false },
      { new: true }
    );
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    res.status(200).json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting reminder',
      error: error.message,
    });
  }
};