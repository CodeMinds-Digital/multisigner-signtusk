'use client';

import React, { useState } from 'react';

const AllFieldTypesDemo: React.FC = () => {
  const [generatedPdf, setGeneratedPdf] = useState<Uint8Array | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAllFieldTypesDemo = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Import all necessary components from pdfme-complete
      const {
        generate,
        text,
        multiVariableText,
        image,
        svg,
        barcodes,
        line,
        rectangle,
        ellipse,
        table,
        getDefaultFont,
        BLANK_PDF
      } = await import('pdfme-complete');

      // Create a comprehensive template showcasing all field types
      const template = {
        basePdf: BLANK_PDF,
        schemas: [[
          // Text fields
          {
            name: 'title',
            type: 'text',
            content: 'All Field Types Demo',
            position: { x: 20, y: 20 },
            width: 170,
            height: 15,
            fontSize: 20,
            fontColor: '#000000',
            fontWeight: 'bold',
          },
          {
            name: 'subtitle',
            type: 'text',
            content: 'Demonstrating pdfme-complete capabilities in Next.js',
            position: { x: 20, y: 40 },
            width: 170,
            height: 10,
            fontSize: 12,
            fontColor: '#666666',
          },
          // Multi-variable text
          {
            name: 'multiText',
            type: 'multiVariableText',
            content: '{}',
            text: 'Hello {name}, welcome to {company}!',
            variables: ['name', 'company'],
            position: { x: 20, y: 60 },
            width: 170,
            height: 15,
            fontSize: 12,
            fontColor: '#333333',
          },
          // QR Code
          {
            name: 'qrcode',
            type: 'qrcode',
            content: 'https://nextjs.org',
            position: { x: 20, y: 85 },
            width: 25,
            height: 25,
          },
          // Barcode
          {
            name: 'barcode',
            type: 'code128',
            content: 'NEXTJS2024',
            position: { x: 55, y: 85 },
            width: 50,
            height: 15,
          },
          // Rectangle
          {
            name: 'rectangle',
            type: 'rectangle',
            content: '',
            position: { x: 20, y: 120 },
            width: 40,
            height: 20,
            color: '#007bff',
          },
          // Ellipse
          {
            name: 'ellipse',
            type: 'ellipse',
            content: '',
            position: { x: 70, y: 120 },
            width: 40,
            height: 20,
            color: '#28a745',
          },
          // Line
          {
            name: 'line',
            type: 'line',
            content: '',
            position: { x: 20, y: 150 },
            width: 170,
            height: 2,
            color: '#dc3545',
          },
          // Table
          {
            name: 'table',
            type: 'table',
            content: '',
            position: { x: 20, y: 160 },
            width: 120,
            height: 40,
            showHead: true,
            head: ['Feature', 'Status', 'Framework'],
            headWidthPercentages: [40, 30, 30],
            tableStyles: {
              borderColor: '#000000',
              borderWidth: 0.3,
            },
            headStyles: {
              fontName: undefined,
              alignment: 'left',
              verticalAlignment: 'middle',
              fontSize: 12,
              lineHeight: 1,
              characterSpacing: 0,
              fontColor: '#ffffff',
              backgroundColor: '#2980ba',
              borderColor: '',
              borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
              padding: { top: 5, bottom: 5, left: 5, right: 5 },
            },
            bodyStyles: {
              fontName: undefined,
              alignment: 'left',
              verticalAlignment: 'middle',
              fontSize: 10,
              lineHeight: 1,
              characterSpacing: 0,
              fontColor: '#000000',
              backgroundColor: '',
              borderColor: '#888888',
              borderWidth: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 },
              padding: { top: 5, bottom: 5, left: 5, right: 5 },
              alternateBackgroundColor: '#f5f5f5',
            },
            columnStyles: {},
          },
          // Read-only text (uses 'text' type)
          {
            name: 'readOnlyText',
            type: 'text',
            content: 'This is read-only text',
            position: { x: 20, y: 210 },
            width: 100,
            height: 10,
            fontSize: 10,
            fontColor: '#888888',
          },
          // Date field
          {
            name: 'date',
            type: 'text',
            content: new Date().toLocaleDateString(),
            position: { x: 20, y: 230 },
            width: 60,
            height: 10,
            fontSize: 10,
            fontColor: '#666666',
          },
          // Footer
          {
            name: 'footer',
            type: 'text',
            content: 'Generated with pdfme-complete in Next.js',
            position: { x: 20, y: 270 },
            width: 170,
            height: 8,
            fontSize: 8,
            fontColor: '#999999',
          },
        ]]
      };

      // Create inputs for the template
      const inputs = [{
        title: 'All Field Types Demo',
        subtitle: 'Demonstrating pdfme-complete capabilities in Next.js',
        multiText: JSON.stringify({ name: 'Developer', company: 'Next.js App' }),
        qrcode: 'https://nextjs.org',
        barcode: 'NEXTJS2024',
        rectangle: '',
        ellipse: '',
        line: '',
        table: [
          ['Feature', 'Status', 'Framework'],
          ['PDF Generation', '✅ Working', 'Next.js'],
          ['Field Types', '✅ Complete', 'React'],
          ['TypeScript', '✅ Supported', 'TS']
        ],
        readOnlyText: 'This is read-only text',
        date: new Date().toLocaleDateString(),
        footer: 'Generated with pdfme-complete in Next.js',
      }];

      // Create plugins object
      const plugins = {
        text,
        multiVariableText,
        image,
        svg,
        qrcode: barcodes.qrcode,
        code128: barcodes.code128,
        line,
        rectangle,
        ellipse,
        table
      };

      // Load font
      const font = await getDefaultFont();

      // Generate PDF
      const pdfBytes = await generate({
        template,
        inputs,
        plugins,
        options: { font }
      });

      setGeneratedPdf(pdfBytes);

      // Create blob and open in new window
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback: create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = 'all-field-types-demo.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error: any) {
      console.error('PDF generation failed:', error);
      setError('PDF generation failed: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="description">
        <h3>🚀 All Field Types Demo</h3>
        <p>
          This demo showcases all available field types in pdfme-complete,
          demonstrating the comprehensive PDF generation capabilities in Next.js.
        </p>
      </div>

      <div className="component-container">
        <div className="controls">
          <div style={{ backgroundColor: '#e7f3ff', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #b3d9ff' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>📋 Included Field Types:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#0066cc' }}>
              <div>• Text Fields</div>
              <div>• Multi-Variable Text</div>
              <div>• QR Codes</div>
              <div>• Barcodes (Code128)</div>
              <div>• Rectangles</div>
              <div>• Ellipses</div>
              <div>• Lines</div>
              <div>• Tables</div>
              <div>• Text Fields (including read-only)</div>
              <div>• Date Fields</div>
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={generateAllFieldTypesDemo}
              disabled={isGenerating}
              className={`btn ${isGenerating ? 'btn-secondary' : 'btn-primary'}`}
            >
              {isGenerating ? '🔄 Generating...' : '🚀 Generate All Field Types PDF'}
            </button>
          </div>

          {error && (
            <div className="error" style={{ marginTop: '1rem' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {generatedPdf && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d4edda', borderRadius: '5px', border: '1px solid #c3e6cb' }}>
              <p style={{ margin: 0, color: '#155724' }}>
                🎉 <strong>Success:</strong> PDF with all field types generated! Size: {generatedPdf.length} bytes
              </p>
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>💡 Next.js Integration Features:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
              <li>Client-side PDF generation with dynamic imports</li>
              <li>TypeScript support for better development experience</li>
              <li>Proper SSR handling with Next.js</li>
              <li>Optimized bundle splitting</li>
              <li>Error boundaries and loading states</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllFieldTypesDemo;
