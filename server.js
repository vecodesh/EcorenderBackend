const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

const authRoutes = require('./routes/auth');
const applianceRoutes = require('./routes/appliances');
const recommendationRoutes = require('./routes/recomm');
const chatbotRoutes = require('./routes/chatbot');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.set('bufferCommands', false);

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in backend/.env');
  process.exit(1);
}

// Use Google's DNS server for resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', authRoutes);
app.use('/api/appliances', applianceRoutes);
app.use('/api', recommendationRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'EcoWatt API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('Connected to MongoDB');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

startServer();
