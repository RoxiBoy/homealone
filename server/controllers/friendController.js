const nodemailer = require("nodemailer");
const Friend = require("../models/Friend");
const User = require("../models/User");
// Get all friends for a user
exports.getFriends = async (req, res) => {
  try {
    const friends = await Friend.find({ user: req.userId }).sort("priority");
    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching friends",
      error: error.message,
    });
  }
};

exports.addFriend = async (req, res) => {
  try {
    const { name, phone, email, relationship, priority } = req.body;

    // Limit to 3 friends per user
    const friendCount = await Friend.countDocuments({ user: req.userId });
    if (friendCount >= 3) {
      return res.status(400).json({ message: "Maximum of 3 friends allowed" });
    }

    // Check if priority is already assigned
    if (priority) {
      const existingFriendWithPriority = await Friend.findOne({
        user: req.userId,
        priority,
      });
      if (existingFriendWithPriority) {
        return res.status(400).json({
          message: `Priority ${priority} is already assigned to another contact`,
        });
      }
    }

    const friend = new Friend({
      user: req.userId,
      name,
      phone,
      email,
      relationship,
      priority: priority || 3,
    });

    await friend.save(); // Save friend in DB

    res.status(201).json(friend);
  } catch (error) {
    console.log("[FriendController] addFriend error", error.message);
    res.status(500).json({
      message: "Error adding friend",
      error: error.message,
    });
  }
}; // Update a friend
exports.updateFriend = async (req, res) => {
  try {
    const { name, phone, email, relationship, priority } = req.body;

    // Check if priority is already assigned to another friend
    if (priority) {
      const existingFriendWithPriority = await Friend.findOne({
        user: req.userId,
        priority,
        _id: { $ne: req.params.id },
      });

      if (existingFriendWithPriority) {
        // Swap priorities
        const currentFriend = await Friend.findOne({
          _id: req.params.id,
          user: req.userId,
        });

        if (currentFriend) {
          await Friend.findByIdAndUpdate(existingFriendWithPriority._id, {
            priority: currentFriend.priority,
          });
        }
      }
    }

    const friend = await Friend.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { name, phone, email, relationship, priority },
      { new: true, runValidators: true }
    );

    if (!friend) {
      return res.status(404).json({ message: "Friend not found" });
    }

    res.status(200).json(friend);
  } catch (error) {
    res.status(500).json({
      message: "Error updating friend",
      error: error.message,
    });
  }
};

// Delete a friend
exports.deleteFriend = async (req, res) => {
  try {
    const friend = await Friend.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!friend) {
      return res.status(404).json({ message: "Friend not found" });
    }

    res.status(200).json({ message: "Friend deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting friend",
      error: error.message,
    });
  }
};
