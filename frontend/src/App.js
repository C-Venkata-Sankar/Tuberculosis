import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState([]);
  const canvasRefs = useRef([]);
  const imageRefs = useRef([]);
  const dropZoneRef = useRef(null);

  const MAX_IMAGES = 10;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

  const truncateFileName = (name, maxLength = 30) => {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop();
    const base = name.substring(0, maxLength - ext.length - 4);
    return `${base}...${ext}`;
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current.classList.remove('drag-over');
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const processFiles = (selectedFiles) => {
    const validFiles = selectedFiles.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported image type (JPEG/PNG only).`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > MAX_IMAGES) {
      toast.warn(`Only the first ${MAX_IMAGES} images will be processed.`);
      validFiles.splice(MAX_IMAGES);
    }

    if (validFiles.length > 0) {
      setFiles(validFiles);
      setPreviews(validFiles.map(file => URL.createObjectURL(file)));
      setResults([]);
      setErrors([]);
      setProgress(validFiles.map(() => 0));
      canvasRefs.current = validFiles.map(() => React.createRef());
      imageRefs.current = validFiles.map(() => React.createRef());
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current.classList.remove('drag-over');
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select or drop at least one image.');
      return;
    }

    setLoading(true);
    const newResults = new Array(files.length).fill(null);
    const newErrors = new Array(files.length).fill(null);
    const newProgress = new Array(files.length).fill(0);
    const concurrencyLimit = 3;

    const uploadImage = async (file, index) => {
      const formData = new FormData();
      formData.append('image', file);
      let retries = 2;

      while (retries >= 0) {
        try {
          newProgress[index] = 50;
          setProgress([...newProgress]);
          const res = await axios.post('https://tuberculosis-express-backend.onrender.com/api/images/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          newProgress[index] = 100;
          setProgress([...newProgress]);

          if (res.data.status === 'success') {
            newResults[index] = res.data.prediction;
            return;
          } else {
            throw new Error(res.data.message || 'Prediction failed.');
          }
        } catch (err) {
          console.error(`Upload error for image ${index + 1}:`, err);
          if (retries === 0) {
            newErrors[index] = err.response?.data?.message || `Failed to upload image ${index + 1}.`;
            newProgress[index] = 100;
            setProgress([...newProgress]);
          }
          retries--;
        }
      }
    };

    const uploadBatch = async (batch) => {
      await Promise.all(batch.map(([file, index]) => uploadImage(file, index)));
    };

    for (let i = 0; i < files.length; i += concurrencyLimit) {
      const batch = files.slice(i, i + concurrencyLimit).map((file, j) => [file, i + j]);
      await uploadBatch(batch);
    }

    setResults(newResults);
    setErrors(newErrors);
    setLoading(false);
    toast.success('Image processing complete!');
  };

  const handleClear = () => {
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setErrors([]);
    setProgress([]);
    canvasRefs.current = [];
    imageRefs.current = [];
    toast.info('All images cleared.');
  };

  // Draw bounding box on canvas for each image
  useEffect(() => {
    results.forEach((result, index) => {
      if (result && result.bbox && canvasRefs.current[index]?.current && imageRefs.current[index]?.current) {
        const canvas = canvasRefs.current[index].current;
        const ctx = canvas.getContext('2d');
        const img = imageRefs.current[index].current;

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const [x1, y1, x2, y2] = result.bbox;
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const scaleX = canvas.width / imgWidth;
        const scaleY = canvas.height / imgHeight;

        ctx.strokeStyle = result.result === 'has tuberculosis' ? '#d32f2f' : '#28a745';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          x1 * scaleX,
          y1 * scaleY,
          (x2 - x1) * scaleX,
          (y2 - y1) * scaleY
        );
      }
    });
  }, [results]);

  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="logo">TB Detect</div>
        <h1 className="app-title">Tuberculosis Detection System</h1>
      </header>
      <main className="container">
        <div className="card">
          <div
            className="drop-zone"
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="region"
            aria-label="Drop zone for image uploads"
          >
            <p className="drop-text">Drag & Drop Images Here or Click to Select</p>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handleFileChange}
              className="file-input"
              id="file-upload"
              aria-label="Upload chest X-ray images"
            />
            <label htmlFor="file-upload" className="file-label">
              Select Images
            </label>
          </div>
          <div className="upload-controls">
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || loading}
              className="upload-button"
              aria-label="Upload and predict tuberculosis for selected images"
            >
              {loading ? (
                <span className="spinner"></span>
              ) : (
                'Upload & Predict'
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={files.length === 0 || loading}
              className="clear-button"
              aria-label="Clear all uploaded images"
            >
              Clear All
            </button>
          </div>

          {errors.length > 0 && errors.some(err => err) && (
            <div className="error-section">
              {errors.map((err, index) => err && (
                <p key={index} className="error">
                  {files[index]?.name || `Image ${index + 1}`}: {err}
                </p>
              ))}
            </div>
          )}

          {previews.length > 0 && (
            <div className="preview-section">
              <div className="summary">
                <h2 className="section-title">Analysis Summary</h2>
                <p>
                  Total Images: {files.length} | 
                  Positive: {results.filter(r => r?.result === 'has tuberculosis').length} | 
                  Negative: {results.filter(r => r?.result === 'no tuberculosis').length}
                </p>
              </div>
              <div className="image-grid">
                {previews.map((preview, index) => (
                  <div key={index} className="image-card">
                    <h3 className="image-label">
                      {truncateFileName(files[index]?.name || `Image ${index + 1}`)}
                    </h3>
                    <div className="image-container">
                      <img
                        src={preview}
                        alt={`Chest X-ray ${files[index]?.name || index + 1}`}
                        className="preview-image"
                        ref={imageRefs.current[index]}
                        onLoad={() => {
                          if (canvasRefs.current[index]?.current && imageRefs.current[index]?.current) {
                            canvasRefs.current[index].current.width = imageRefs.current[index].current.width;
                            canvasRefs.current[index].current.height = imageRefs.current[index].current.height;
                          }
                        }}
                      />
                      <canvas ref={canvasRefs.current[index]} className="bbox-canvas" />
                      {progress[index] > 0 && progress[index] < 100 && (
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${progress[index]}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                    {results[index] && (
                      <div className="prediction-section">
                        <div className={`result-card ${results[index].result === 'has tuberculosis' ? 'result-positive' : 'result-negative'}`}>
                          <span className="result-icon">
                            {results[index].result === 'has tuberculosis' ? '⚠️' : '✅'}
                          </span>
                          <p className="result-text">
                            {results[index].result === 'has tuberculosis' ? 'Has Tuberculosis' : 'No Tuberculosis'}
                          </p>
                        </div>
                        <p className="confidence">
                          Confidence: {(results[index].confidence * 100).toFixed(2)}%
                        </p>
                        {results[index].bbox && (
                          <p className="bbox-info">
                            Bounding Box: [{results[index].bbox[0].toFixed(2)}, {results[index].bbox[1].toFixed(2)}, {results[index].bbox[2].toFixed(2)}, {results[index].bbox[3].toFixed(2)}]
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="footer">
        <p>© 2025 TB Detect. All rights reserved.</p>
      </footer>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
