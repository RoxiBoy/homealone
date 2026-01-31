const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register a new user
exports.register = async (req, res) => {
  console.log("Register Endpoint Hit")
  try {

    const { username, password, name, email, phone, age } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Username or email already exists' 
      });
    }

    // Create new user
    const user = new User({
      username,
      password,
      name,
      email,
      phone,
      age,
    });

    await user.save();


    res.status(201).json({
      message: 'User registered successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error registering user',
      error: error.message,
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Trying loggin in for: ${username}`)

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Ensure the user has a nextCheckInAt scheduled (server-driven timer)
    try {
      if (user.checkInStatus !== 'emergency' && user.dnd !== true) {
        const now = new Date();
        const intervalHours = user.checkInIntervalHours ?? 2;

        if (intervalHours > 0) {
          // If nothing scheduled yet or the scheduled time is in the past, schedule a new one
          if (!user.nextCheckInAt || user.nextCheckInAt <= now) {
            user.nextCheckInAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
            await user.save();
            console.log('[authController.login] Scheduled nextCheckInAt for user', user._id.toString(), 'at', user.nextCheckInAt.toISOString());
          }
        }
      }
    } catch (scheduleErr) {
      console.warn('[authController.login] Failed to schedule nextCheckInAt on login', scheduleErr);
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user info and token
    res.status(200).json({
        token,
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            phone: user.phone,
            age: user.age,
            checkInIntervalHours: user.checkInIntervalHours,
            emergencyCountdownMinutes: user.emergencyCountdownMinutes,
            dnd: user.dnd ?? false,
            isActive: user.isActive ?? false,
        },
    });
    } catch (error) {
        res.status(500).json({
        message: 'Error logging in',
        error: error.message,
        });
    }
};
