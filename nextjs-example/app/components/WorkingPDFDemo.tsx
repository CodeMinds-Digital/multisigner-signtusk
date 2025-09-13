'use client';

import React, { useState, useEffect, useRef } from 'react';

// Import from pdfme-complete package
import { generate } from 'pdfme-complete';
import {
  text,
  multiVariableText,
  image,
  svg,
  barcodes,
  line,
  rectangle,
  ellipse,
  table,
  readOnlyText,
  readOnlyImage,
  readOnlySvg
} from 'pdfme-complete';
import { getDefaultFont, BLANK_PDF } from 'pdfme-complete';

const WorkingPDFDemo: React.FC = () => {
  const [pdfBase64, setPdfBase64] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [inputs, setInputs] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<Uint8Array | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load sample PDF from public folder and create template
  const loadSamplePDF = () => {
    setLoading(true);
    setError(null);

    console.log('🔄 Loading sample.pdf from public folder...');

    fetch('/sample.pdf')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log('📡 PDF response received, status:', response.status);
        return response.blob();
      })
      .then(blob => {
        console.log('📄 PDF blob loaded, size:', blob.size);

        const reader = new FileReader();
        reader.onload = () => {
          if (!mountedRef.current) return;
          try {
            // Convert to ArrayBuffer first, then to Uint8Array
            const arrayBuffer = reader.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);
            console.log('✅ PDF loaded as Uint8Array, length:', uint8Array.length);
            setPdfBase64(uint8Array);
            createWorkingTemplate(uint8Array);
            setLoading(false);
          } catch (err) {
            console.error('Error processing PDF:', err);
            setError('Failed to process PDF file');
            setLoading(false);
          }
        };
        reader.onerror = () => {
          if (!mountedRef.current) return;
          console.error('FileReader error');
          setError('Failed to read PDF file');
          setLoading(false);
        };
        reader.readAsArrayBuffer(blob);
      })
      .catch(error => {
        if (!mountedRef.current) return;
        console.error('Error loading PDF:', error);
        setError('Failed to load sample.pdf: ' + error.message);
        setLoading(false);
      });
  };

  // Create template with working field types
  const createWorkingTemplate = (pdfData: Uint8Array) => {
    try {
      console.log('🔧 Creating working template with sample.pdf...');
      console.log('🔧 PDF data type:', typeof pdfData);
      console.log('🔧 PDF data length:', pdfData ? pdfData.length : 'null');

      // Create a comprehensive template with multiple field types
      const workingTemplate = {
        basePdf: pdfData,
        schemas: [[
          // Text fields
          {
            name: 'title',
            type: 'text',
            content: 'Sample Document Title',
            position: { x: 20, y: 30 },
            width: 150,
            height: 20,
            fontSize: 18,
            fontColor: '#000000',
          },
          {
            name: 'description',
            type: 'text',
            content: 'This is a sample description text that demonstrates the text field functionality.',
            position: { x: 20, y: 60 },
            width: 160,
            height: 30,
            fontSize: 12,
            fontColor: '#333333',
          },
          {
            name: 'date',
            type: 'text',
            content: new Date().toLocaleDateString(),
            position: { x: 20, y: 100 },
            width: 80,
            height: 15,
            fontSize: 12,
            fontColor: '#666666',
          },
          // QR Code
          {
            name: 'qrcode',
            type: 'qrcode',
            content: 'https://pdfme.com',
            position: { x: 150, y: 100 },
            width: 30,
            height: 30,
          },
          // Rectangle
          {
            name: 'rectangle',
            type: 'rectangle',
            content: '',
            position: { x: 20, y: 140 },
            width: 50,
            height: 20,
            color: '#007bff',
          },
          // Line
          {
            name: 'line',
            type: 'line',
            content: '',
            position: { x: 80, y: 150 },
            width: 80,
            height: 1,
            color: '#dc3545',
          },
        ]]
      };

      // Create corresponding inputs
      const workingInputs = [{
        title: 'Next.js PDF Demo',
        description: 'This PDF was generated using pdfme-complete in a Next.js application with TypeScript support.',
        date: new Date().toLocaleDateString(),
        qrcode: 'https://nextjs.org',
        rectangle: '',
        line: '',
      }];

      console.log('🔧 Created template basePdf type:', typeof workingTemplate.basePdf);
      console.log('🔧 Created template basePdf length:', workingTemplate.basePdf ? workingTemplate.basePdf.length : 'null');
      console.log('🔧 Created template schemas type:', typeof workingTemplate.schemas);
      console.log('🔧 Created template schemas:', workingTemplate.schemas);

      setTemplate(workingTemplate);
      setInputs(workingInputs);
      console.log('✅ Working template and inputs created');
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template: ' + (err as Error).message);
    }
  };

  // Generate actual PDF using real pdfme
  const generateRealPDF = async () => {
    if (!template || !inputs) {
      setError('Template and inputs are required');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('🚀 Starting PDF generation...');
      console.log('📋 Template:', template);
      console.log('📝 Inputs:', inputs);

      // Create plugins object with all the field types we're using
      const plugins = {
        text,
        multiVariableText,
        image,
        svg,
        qrcode: barcodes.qrcode,
        line,
        rectangle,
        ellipse,
        table,
        readOnlyText,
        readOnlyImage,
        readOnlySvg
      };

      console.log('🔌 Plugins:', Object.keys(plugins));

      // Load font
      const font = await getDefaultFont();
      console.log('🔤 Font loaded');

      // Generate the actual PDF with detailed debugging
      console.log('🚀 About to call generate with:');
      console.log('  template:', template);
      console.log('  inputs:', inputs);
      console.log('  plugins:', plugins);
      console.log('  font:', font);

      let pdfBytes: Uint8Array;
      try {
        pdfBytes = await generate({
          template,
          inputs,
          plugins,
          options: {
            font
          }
        });
        console.log('✅ PDF generated successfully, size:', pdfBytes.length);
      } catch (generateError) {
        console.error('❌ Generate function error:', generateError);
        console.error('❌ Error stack:', (generateError as Error).stack);
        throw generateError;
      }

      // Store the generated PDF
      setGeneratedPdf(pdfBytes);

      // Create blob and open in new window
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Open in new window
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback: create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = 'working-pdfme-demo.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      console.log('✅ PDF generation completed successfully!');
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      setError('PDF generation failed: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="description">
        <h3>🎯 Working PDF Demo</h3>
        <p>This demo uses the actual pdfme-complete package to generate real PDFs in Next.js!</p>
      </div>

      <div className="component-container">
        <div className="controls">
          <div style={{ backgroundColor: '#e7f3ff', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #b3d9ff' }}>
            <p style={{ margin: 0, color: '#0066cc' }}>
              🚀 <strong>Real Implementation:</strong> This demo uses pdfme-complete to add multiple schema types to your existing PDF!
            </p>
          </div>

          <div className="button-group">
            <button
              onClick={loadSamplePDF}
              disabled={loading}
              className={`btn ${loading ? 'btn-secondary' : 'btn-primary'}`}
            >
              {loading ? 'Loading PDF...' : '📄 Load Sample PDF & Add Schemas'}
            </button>

            {template && (
              <button
                onClick={generateRealPDF}
                disabled={isGenerating}
                className={`btn ${isGenerating ? 'btn-secondary' : 'btn-danger'}`}
              >
                {isGenerating ? 'Generating...' : '🎯 Generate Real PDF'}
              </button>
            )}
          </div>

          {error && (
            <div className="error" style={{ marginTop: '1rem' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {template && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d4edda', borderRadius: '5px', border: '1px solid #c3e6cb' }}>
              <p style={{ margin: 0, color: '#155724' }}>
                ✅ <strong>Template Ready:</strong> PDF loaded and template created with {template.schemas[0].length} field types!
              </p>
            </div>
          )}

          {generatedPdf && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
              <p style={{ margin: 0, color: '#856404' }}>
                🎉 <strong>Success:</strong> PDF generated successfully! Size: {generatedPdf.length} bytes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkingPDFDemo;
