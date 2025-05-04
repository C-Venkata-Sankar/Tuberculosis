const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const imageRoutes = require('./routes/imageRoutes');

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS for React frontend
app.use(cors({
  origin: 'http://localhost:3000', // Adjust to your React app's URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Middleware for parsing JSON and handling file uploads
app.use(express.json());
app.use(fileUpload());

// Debugging middleware to log all incoming requests
app.use((req, res, next) => {
  if (req.files) {
  }
  next();
});

// Routes
app.use('/api/images', imageRoutes);

// Error handling middleware for debugging
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  res.status(500).json({ status: 'error', message: 'Internal server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`CORS enabled for: http://localhost:3000`);
});