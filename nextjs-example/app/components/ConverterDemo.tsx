'use client';

import React, { useState } from 'react';

const ConverterDemo: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: string; count: number; totalSize: number } | null>(null);
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');
  const [imageQuality, setImageQuality] = useState(100);
  const [imageScale, setImageScale] = useState(1.5);

  // Helper function to read file as ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  // Convert PDF to Images
  const convertPDFToImages = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file to convert');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔄 Starting PDF to images conversion...');

      // Import pdf2img function from pdfme-complete
      const pdfmeModule = await import('pdfme-complete');
      const pdf2img = (pdfmeModule as any).pdf2img;

      if (!pdf2img) {
        throw new Error('pdf2img function not available in this environment');
      }

      // Read file as ArrayBuffer
      const pdfBuffer = await readFileAsArrayBuffer(selectedFile);

      console.log(`📄 Converting PDF to ${imageFormat.toUpperCase()} images...`);

      // Convert PDF to images
      const images = await pdf2img(pdfBuffer, {
        format: imageFormat,
        quality: imageQuality,
        scale: imageScale
      });

      console.log(`✅ PDF converted to ${images.length} images!`);

      // Download each image
      images.forEach((imageBuffer: Uint8Array, index: number) => {
        const blob = new Blob([imageBuffer as BlobPart], { type: `image/${imageFormat}` });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `page-${index + 1}.${imageFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

      setResult({
        type: `${imageFormat.toUpperCase()} Images`,
        count: images.length,
        totalSize: images.reduce((total: number, img: Uint8Array) => total + img.byteLength, 0)
      });

    } catch (error: any) {
      console.error('❌ PDF to images conversion failed:', error);
      setError('PDF to images conversion failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert Images to PDF
  const convertImagesToPDF = async () => {
    if (!selectedFile) {
      setError('Please select image files to convert');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔄 Starting images to PDF conversion...');

      // Import img2pdf function from pdfme-complete
      const pdfmeModule = await import('pdfme-complete');
      const img2pdf = (pdfmeModule as any).img2pdf;

      if (!img2pdf) {
        throw new Error('img2pdf function not available in this environment');
      }

      // For demo purposes, we'll use the selected file as a single image
      // In a real app, you'd allow multiple image selection
      const imageFiles = [selectedFile];

      console.log(`📄 Converting ${imageFiles.length} image(s) to PDF...`);

      // Convert images to PDF
      const pdfBuffer = await img2pdf(imageFiles, {
        pageSize: 'A4',
        orientation: 'portrait'
      });

      console.log('✅ Images converted to PDF!');

      // Create blob and URL
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Open in new window
      window.open(url, '_blank');

      // Also create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted-images.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setResult({
        type: 'PDF from Images',
        count: 1,
        totalSize: pdfBuffer.byteLength
      });

      // Clean up URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error: any) {
      console.error('❌ Images to PDF conversion failed:', error);
      setError('Images to PDF conversion failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get PDF size information
  const getPDFSize = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file to analyze');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔄 Getting PDF size information...');

      // Import pdf2size function from pdfme-complete
      const pdfmeModule = await import('pdfme-complete');
      const pdf2size = (pdfmeModule as any).pdf2size;

      if (!pdf2size) {
        throw new Error('pdf2size function not available in this environment');
      }

      // Read file as ArrayBuffer
      const pdfBuffer = await readFileAsArrayBuffer(selectedFile);

      console.log('📄 Analyzing PDF dimensions...');

      // Get PDF size information
      const sizeInfo = await pdf2size(pdfBuffer);

      console.log('✅ PDF size information retrieved!');
      console.log('Size info:', sizeInfo);

      alert(`PDF Size Information:\n${JSON.stringify(sizeInfo, null, 2)}`);

      setResult({
        type: 'PDF Size Analysis',
        count: Array.isArray(sizeInfo) ? sizeInfo.length : 1,
        totalSize: selectedFile.size
      });

    } catch (error: any) {
      console.error('❌ PDF size analysis failed:', error);
      setError('PDF size analysis failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="description">
        <h3>🔄 Format Converter</h3>
        <p>
          Convert between PDF and image formats using pdfme-complete: PDF to images,
          images to PDF, and analyze PDF dimensions.
        </p>
      </div>

      <div className="component-container">
        <div className="controls">
          <div style={{ backgroundColor: '#e7f3ff', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #b3d9ff' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>📋 Available Conversions:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#0066cc' }}>
              <div>• PDF → PNG/JPEG Images</div>
              <div>• Images → PDF Document</div>
              <div>• PDF Size Analysis</div>
              <div>• High-quality conversion</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="file-input-label">
              📁 Select File (PDF or Image)
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileSelect}
              />
            </label>
            {selectedFile && (
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Conversion Settings */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 15px 0' }}>⚙️ Conversion Settings</h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Image Format:</label>
                <select
                  value={imageFormat}
                  onChange={(e) => setImageFormat(e.target.value as 'png' | 'jpeg')}
                  style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="png">PNG (Lossless)</option>
                  <option value="jpeg">JPEG (Compressed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Quality (%):</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={imageQuality}
                  onChange={(e) => setImageQuality(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>{imageQuality}%</div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Scale Factor:</label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={imageScale}
                  onChange={(e) => setImageScale(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>{imageScale}x</div>
              </div>
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={convertPDFToImages}
              disabled={isProcessing || !selectedFile || !selectedFile.type.includes('pdf')}
              className={`btn ${isProcessing ? 'btn-secondary' : 'btn-primary'}`}
            >
              {isProcessing ? '🔄 Converting...' : '📸 PDF → Images'}
            </button>

            <button
              onClick={convertImagesToPDF}
              disabled={isProcessing || !selectedFile || !selectedFile.type.includes('image')}
              className={`btn ${isProcessing ? 'btn-secondary' : 'btn-success'}`}
            >
              {isProcessing ? '🔄 Converting...' : '📄 Images → PDF'}
            </button>

            <button
              onClick={getPDFSize}
              disabled={isProcessing || !selectedFile || !selectedFile.type.includes('pdf')}
              className={`btn ${isProcessing ? 'btn-secondary' : 'btn-info'}`}
            >
              {isProcessing ? '🔄 Analyzing...' : '📏 Analyze PDF Size'}
            </button>
          </div>

          {error && (
            <div className="error" style={{ marginTop: '1rem' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {result && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d4edda', borderRadius: '5px', border: '1px solid #c3e6cb' }}>
              <p style={{ margin: 0, color: '#155724' }}>
                🎉 <strong>Success:</strong> {result.type} - {result.count} file(s), Total size: {(result.totalSize / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>💡 Conversion Features:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
              <li><strong>High Quality:</strong> Configurable quality and scale settings</li>
              <li><strong>Multiple Formats:</strong> PNG (lossless) and JPEG (compressed)</li>
              <li><strong>Batch Processing:</strong> Convert all PDF pages to images</li>
              <li><strong>Size Analysis:</strong> Get detailed PDF dimension information</li>
              <li><strong>Browser-based:</strong> All processing happens in your browser</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConverterDemo;
