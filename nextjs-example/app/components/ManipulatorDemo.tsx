'use client';

import React, { useState } from 'react';

const ManipulatorDemo: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: string; size: number; url: string } | null>(null);

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
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setError(null);
    setResult(null);
  };

  // Merge PDFs
  const mergePDFs = async () => {
    if (selectedFiles.length < 2) {
      setError('Please select at least 2 PDF files to merge');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔄 Starting PDF merge...');

      // Import merge function from pdfme-complete
      const { merge } = await import('pdfme-complete');

      // Read all files as ArrayBuffers
      const pdfBuffers = await Promise.all(
        selectedFiles.map(file => readFileAsArrayBuffer(file))
      );

      console.log(`📄 Merging ${pdfBuffers.length} PDFs...`);

      // Merge PDFs
      const mergedPdf = await merge(pdfBuffers);

      console.log('✅ PDFs merged successfully!');

      // Create blob and URL
      const blob = new Blob([mergedPdf as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        type: 'Merged PDF',
        size: mergedPdf.length,
        url: url
      });

      // Open in new window
      window.open(url, '_blank');

    } catch (error: any) {
      console.error('❌ PDF merge failed:', error);
      setError('PDF merge failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Split PDF
  const splitPDF = async () => {
    if (selectedFiles.length !== 1) {
      setError('Please select exactly 1 PDF file to split');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔄 Starting PDF split...');

      // Import split function from pdfme-complete
      const { split } = await import('pdfme-complete');

      // Read file as ArrayBuffer
      const pdfBuffer = await readFileAsArrayBuffer(selectedFiles[0]);

      console.log('📄 Splitting PDF into individual pages...');

      // Split PDF into individual pages
      const splitPdfs = await split(pdfBuffer, [
        { start: 0, end: 0 }, // First page
        { start: 1, end: 1 }, // Second page (if exists)
        { start: 2, end: 2 }, // Third page (if exists)
      ]);

      console.log(`✅ PDF split into ${splitPdfs.length} parts!`);

      // Download each split PDF
      splitPdfs.forEach((pdfBytes: Uint8Array, index: number) => {
        const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `split-page-${index + 1}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

      setResult({
        type: `Split PDF (${splitPdfs.length} pages)`,
        size: splitPdfs.reduce((total, pdf) => total + pdf.length, 0),
        url: ''
      });

    } catch (error: any) {
      console.error('❌ PDF split failed:', error);
      setError('PDF split failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rotate PDF
  const rotatePDF = async (degrees: 90 | 180 | 270) => {
    if (selectedFiles.length !== 1) {
      setError('Please select exactly 1 PDF file to rotate');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log(`🔄 Starting PDF rotation (${degrees}°)...`);

      // Import rotate function from pdfme-complete
      const { rotate } = await import('pdfme-complete');

      // Read file as ArrayBuffer
      const pdfBuffer = await readFileAsArrayBuffer(selectedFiles[0]);

      console.log(`📄 Rotating PDF by ${degrees} degrees...`);

      // Rotate PDF
      const rotatedPdf = await rotate(pdfBuffer, degrees);

      console.log('✅ PDF rotated successfully!');

      // Create blob and URL
      const blob = new Blob([rotatedPdf as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        type: `Rotated PDF (${degrees}°)`,
        size: rotatedPdf.length,
        url: url
      });

      // Open in new window
      window.open(url, '_blank');

    } catch (error: any) {
      console.error('❌ PDF rotation failed:', error);
      setError('PDF rotation failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove pages from PDF
  const removePages = async () => {
    if (selectedFiles.length !== 1) {
      setError('Please select exactly 1 PDF file to remove pages from');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔄 Starting page removal...');

      // Import remove function from pdfme-complete
      const { remove } = await import('pdfme-complete');

      // Read file as ArrayBuffer
      const pdfBuffer = await readFileAsArrayBuffer(selectedFiles[0]);

      console.log('📄 Removing first page from PDF...');

      // Remove first page (index 0)
      const modifiedPdf = await remove(pdfBuffer, [0]);

      console.log('✅ Page removed successfully!');

      // Create blob and URL
      const blob = new Blob([modifiedPdf as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        type: 'PDF with page removed',
        size: modifiedPdf.length,
        url: url
      });

      // Open in new window
      window.open(url, '_blank');

    } catch (error: any) {
      console.error('❌ Page removal failed:', error);
      setError('Page removal failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="description">
        <h3>🔧 PDF Manipulator</h3>
        <p>
          Manipulate PDF documents using pdfme-complete: merge multiple PDFs, split into pages,
          rotate, and remove pages.
        </p>
      </div>

      <div className="component-container">
        <div className="controls">
          <div style={{ backgroundColor: '#e7f3ff', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #b3d9ff' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>📋 Available Operations:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#0066cc' }}>
              <div>• Merge multiple PDFs</div>
              <div>• Split PDF into pages</div>
              <div>• Rotate PDF pages</div>
              <div>• Remove specific pages</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="file-input-label">
              📁 Select PDF Files
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileSelect}
              />
            </label>
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                Selected: {selectedFiles.map(f => f.name).join(', ')}
              </div>
            )}
          </div>

          <div className="button-group">
            <button
              onClick={mergePDFs}
              disabled={isProcessing || selectedFiles.length < 2}
              className={`btn ${isProcessing ? 'btn-secondary' : 'btn-primary'}`}
            >
              {isProcessing ? '🔄 Processing...' : '🔗 Merge PDFs'}
            </button>

            <button
              onClick={splitPDF}
              disabled={isProcessing || selectedFiles.length !== 1}
              className={`btn ${isProcessing ? 'btn-secondary' : 'btn-info'}`}
            >
              {isProcessing ? '🔄 Processing...' : '✂️ Split PDF'}
            </button>

            <button
              onClick={() => rotatePDF(90)}
              disabled={isProcessing || selectedFiles.length !== 1}
              className={`btn ${isProcessing ? 'btn-secondary' : 'btn-warning'}`}
            >
              {isProcessing ? '🔄 Processing...' : '↻ Rotate 90°'}
            </button>

            <button
              onClick={() => rotatePDF(180)}
              disabled={isProcessing || selectedFiles.length !== 1}
              className={`btn ${isProcessing ? 'btn-secondary' : 'btn-warning'}`}
            >
              {isProcessing ? '🔄 Processing...' : '↻ Rotate 180°'}
            </button>

            <button
              onClick={removePages}
              disabled={isProcessing || selectedFiles.length !== 1}
              className={`btn ${isProcessing ? 'btn-secondary' : 'btn-danger'}`}
            >
              {isProcessing ? '🔄 Processing...' : '🗑️ Remove First Page'}
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
                🎉 <strong>Success:</strong> {result.type} created! Size: {result.size} bytes
              </p>
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>💡 Usage Tips:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
              <li><strong>Merge:</strong> Select 2+ PDF files and click "Merge PDFs"</li>
              <li><strong>Split:</strong> Select 1 PDF file and click "Split PDF"</li>
              <li><strong>Rotate:</strong> Select 1 PDF file and choose rotation angle</li>
              <li><strong>Remove:</strong> Select 1 PDF file to remove the first page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManipulatorDemo;
