const mongoose = require('mongoose');
const app = require('./app');
const { startCheckInScheduler } = require('./checkInScheduler');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homealone';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startCheckInScheduler();
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });
