const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');

router.post('/upload', async (req, res) => {
  try {
    // Check if an image file is included in the request
    if (!req.files || !req.files.image) {
      console.log('No image file provided in request');
      return res.status(400).json({ status: 'error', message: 'No image file provided' });
    }

    const image = req.files.image;

    // Validate file type
    if (!image.mimetype.startsWith('image/')) {
      console.log('Invalid file type:', image.mimetype);
      return res.status(400).json({ status: 'error', message: 'File must be an image' });
    }

    // Create FormData to forward to FastAPI
    const formData = new FormData();
    formData.append('file', image.data, image.name);

    // Forward the image to FastAPI
    const fastapiResponse = await axios.post('http://127.0.0.1:8000/predict', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });


    // Send FastAPI's response back to the frontend
    res.json({ status: 'success', prediction: fastapiResponse.data });
  } catch (error) {
    console.error('Error forwarding to FastAPI:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('FastAPI server is not running or not accessible at http://127.0.0.1:8000');
      return res.status(500).json({
        status: 'error',
        message: 'Failed to connect to prediction server. Please ensure the backend is running.',
      });
    }
    res.status(500).json({ status: 'error', message: error.message || 'Failed to process image' });
  }
});

module.exports = router;