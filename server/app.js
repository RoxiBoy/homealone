const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const friendRoutes = require('./routes/friendRoutes');
const emergencyContactRoutes = require('./routes/emergencyContactRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const tipRoutes = require('./routes/tipRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/emergency-contact', emergencyContactRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/tips', tipRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Something went wrong!',
  });
});

module.exports = app;
