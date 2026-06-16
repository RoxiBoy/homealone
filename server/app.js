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
const checkInSessionRoutes = require('./routes/checkInSessionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const logRoutes = require('./routes/logRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/emergency-contact', emergencyContactRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/checkins', checkInSessionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/logs', logRoutes);

// const { sendSms } = require("./services/smsService")

// sendSms("Test_User_02", "+9779816015362")

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Something went wrong!',
  });
});

module.exports = app;
