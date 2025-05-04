const Image = require('../models/Image');
const path = require('path');
const { spawn } = require('child_process');

exports.uploadImage = async (req, res) => {
  const file = req.file;
  const newImage = new Image(file);
  await newImage.save();

  // Call Python script
  const python = spawn('python3', [
    path.resolve(__dirname, '../../ml/detect.py'),
    file.path,
  ]);

  python.stdout.on('data', (data) => {
    console.log(`Model Output: ${data}`);
  });

  python.stderr.on('data', (data) => {
    console.error(`Error: ${data}`);
  });

  python.on('close', (code) => {
    res.json({ message: 'Image uploaded and processed', image: newImage });
  });
};
