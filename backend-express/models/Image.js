const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  path: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Image', ImageSchema);
