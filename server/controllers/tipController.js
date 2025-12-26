const Tip = require('../models/Tip');

// Get all tips
exports.getTips = async (req, res) => {
  try {
    const tips = await Tip.find();
    res.status(200).json(tips);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching tips',
      error: error.message,
    });
  }
};

// Get a specific tip
exports.getTip = async (req, res) => {
  try {
    const tip = await Tip.findById(req.params.id);
    
    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }
    
    res.status(200).json(tip);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching tip',
      error: error.message,
    });
  }
};

// Admin only: Create a new tip
exports.createTip = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    const tip = new Tip({
      title,
      content,
      category,
    });
    
    await tip.save();
    
    res.status(201).json(tip);
  } catch (error) {
    res.status(500).json({
      message: 'Error creating tip',
      error: error.message,
    });
  }
};

// Admin only: Update a tip
exports.updateTip = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    const tip = await Tip.findByIdAndUpdate(
      req.params.id,
      { title, content, category },
      { new: true, runValidators: true }
    );
    
    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }
    
    res.status(200).json(tip);
  } catch (error) {
    res.status(500).json({
      message: 'Error updating tip',
      error: error.message,
    });
  }
};

// Admin only: Delete a tip
exports.deleteTip = async (req, res) => {
  try {
    const tip = await Tip.findByIdAndDelete(req.params.id);
    
    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }
    
    res.status(200).json({ message: 'Tip deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting tip',
      error: error.message,
    });
  }
};
