'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { getDefaultFont, BLANK_PDF } from 'pdfme-complete';

const DesignerDemo: React.FC = () => {
  const designerRef = useRef<HTMLDivElement>(null);
  const designer = useRef<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to read file
  const readFile = (file: File, type: 'text' | 'dataURL' | 'arrayBuffer'): Promise<string | ArrayBuffer> => {
    return new Promise((resolve) => {
      const fileReader = new FileReader();
      fileReader.addEventListener('load', (e) => {
        if (e && e.target && e.target.result && file !== null) {
          resolve(e.target.result);
        }
      });
      if (file !== null) {
        if (type === 'text') {
          fileReader.readAsText(file);
        } else if (type === 'dataURL') {
          fileReader.readAsDataURL(file);
        } else if (type === 'arrayBuffer') {
          fileReader.readAsArrayBuffer(file);
        }
      }
    });
  };

  // Get blank template
  const getBlankTemplate = () => ({
    schemas: [{}],
    basePdf: {
      width: 210,
      height: 297,
      padding: [20, 10, 20, 10],
    },
  });

  // Get fonts data
  const getFontsData = () => {
    return getDefaultFont();
  };

  // Download JSON file
  const downloadJsonFile = (json: any, title: string) => {
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!designer.current) return;

    try {
      const { generate, getInputFromTemplate, builtInPlugins } = await import('pdfme-complete');
      const template = designer.current.getTemplate();
      const inputs = getInputFromTemplate(template);

      console.log('Generating PDF with template:', template);
      console.log('Using inputs:', inputs);

      const pdf = await generate({
        template,
        inputs,
        plugins: builtInPlugins,
        options: {
          font: getFontsData(),
          lang: 'en',
        },
      });

      const blob = new Blob([pdf as BlobPart], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob));
    } catch (e: any) {
      console.error('PDF generation error:', e);

      if (e.message && e.message.includes('encrypted')) {
        alert('Error: The uploaded PDF is encrypted and cannot be used as a base template.\n\nPlease:\n1. Use a non-encrypted PDF, or\n2. Use "Load Sample PDF" which provides a non-encrypted template, or\n3. Start with a blank template by clicking "Reset Template"');
      } else {
        alert('Error generating PDF: ' + e.message);
      }
    }
  };

  // Build designer
  const buildDesigner = useCallback(async () => {
    if (!designerRef.current) return;

    try {
      setIsLoading(true);
      let initialTemplate = getBlankTemplate();
      const templateFromLocal = localStorage.getItem('nextjs-designer-template');

      if (templateFromLocal) {
        try {
          initialTemplate = JSON.parse(templateFromLocal);
        } catch (e) {
          console.warn('Invalid template in localStorage, using blank template');
        }
      }

      // Import Designer dynamically
      const pdfmeModule = await import('pdfme-complete');
      const Designer = (pdfmeModule as any).Designer;
      const builtInPlugins = (pdfmeModule as any).builtInPlugins;

      if (!Designer) {
        throw new Error('Designer component not available in this environment');
      }

      designer.current = new Designer({
        domContainer: designerRef.current,
        template: initialTemplate,
        plugins: builtInPlugins,
        options: {
          font: getFontsData(),
          lang: 'en',
          theme: {
            token: { colorPrimary: '#25c2a0' },
          },
        },
      });

      designer.current.onSaveTemplate(onSaveTemplate);
      setTemplate(initialTemplate);
      setIsLoading(false);
    } catch (error) {
      console.error('Error building designer:', error);
      setIsLoading(false);
    }
  }, []);

  // Handle base PDF change
  const onChangeBasePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      readFile(e.target.files[0], 'dataURL').then(async (basePdf) => {
        try {
          // Test if the PDF can be loaded (check for encryption)
          const { PDFDocument } = await import('pdfme-complete');
          const arrayBuffer = await fetch(basePdf as string).then(res => res.arrayBuffer());

          try {
            await PDFDocument.load(arrayBuffer);
          } catch (loadError: any) {
            if (loadError.message && loadError.message.includes('encrypted')) {
              alert('Error: The uploaded PDF is encrypted and cannot be used.\n\nPlease use a non-encrypted PDF file, or try the "Load Sample PDF" option instead.');
              return;
            }
            throw loadError;
          }

          if (designer.current) {
            const newTemplate = { ...designer.current.getTemplate() };
            newTemplate.basePdf = basePdf;
            designer.current.updateTemplate(newTemplate);
            setTemplate(newTemplate);
            localStorage.setItem('nextjs-designer-template', JSON.stringify(newTemplate));
          }
        } catch (error: any) {
          console.error('Error loading PDF:', error);
          alert('Error loading PDF: ' + error.message);
        }
      });
    }
  };

  // Handle template load
  const onLoadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      readFile(e.target.files[0], 'text').then((jsonStr) => {
        try {
          const templateJson = JSON.parse(jsonStr as string);
          if (designer.current) {
            designer.current.updateTemplate(templateJson);
            setTemplate(templateJson);
          }
        } catch (error: any) {
          alert('Invalid template file: ' + error.message);
        }
      });
    }
  };

  // Save template
  const onSaveTemplate = (template: any) => {
    const templateToSave = template || designer.current?.getTemplate();
    if (templateToSave) {
      localStorage.setItem('nextjs-designer-template', JSON.stringify(templateToSave));
      setTemplate(templateToSave);
      console.log('Template saved to localStorage');
    }
  };

  // Download template
  const onDownloadTemplate = () => {
    if (designer.current) {
      downloadJsonFile(designer.current.getTemplate(), 'template');
    }
  };

  // Reset template
  const onResetTemplate = () => {
    localStorage.removeItem('nextjs-designer-template');
    if (designer.current) {
      const blankTemplate = getBlankTemplate();
      designer.current.updateTemplate(blankTemplate);
      setTemplate(blankTemplate);
    }
  };

  // Load sample PDF
  const loadSamplePDF = async () => {
    try {
      const response = await fetch('/sample.pdf');
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      const dataURL = `data:application/pdf;base64,${base64}`;

      if (designer.current) {
        const newTemplate = { ...designer.current.getTemplate() };
        newTemplate.basePdf = dataURL;
        designer.current.updateTemplate(newTemplate);
        setTemplate(newTemplate);
      }
    } catch (error: any) {
      alert('Error loading sample PDF: ' + error.message);
    }
  };

  useEffect(() => {
    if (designerRef.current) {
      buildDesigner();
    }
    return () => {
      designer.current?.destroy();
    };
  }, [buildDesigner]);

  return (
    <div>
      <div className="description">
        <h3>🎨 PDF Designer</h3>
        <p>Create and edit PDF templates with drag-and-drop functionality in Next.js.</p>
      </div>

      <div className="component-container">
        <div className="controls">
          <div className="button-group">
            <button
              onClick={loadSamplePDF}
              className="btn btn-primary"
            >
              📄 Load Sample PDF
            </button>

            <label className="file-input-label">
              📁 Change Base PDF
              <input
                type="file"
                accept="application/pdf"
                onChange={onChangeBasePDF}
              />
            </label>

            <label className="file-input-label">
              📋 Load Template
              <input
                type="file"
                accept="application/json"
                onChange={onLoadTemplate}
              />
            </label>

            <button
              onClick={onDownloadTemplate}
              className="btn btn-success"
            >
              💾 Download Template
            </button>

            <button
              onClick={generatePDF}
              className="btn btn-danger"
            >
              🎯 Generate PDF
            </button>

            <button
              onClick={onResetTemplate}
              className="btn btn-secondary"
            >
              🔄 Reset Template
            </button>
          </div>
        </div>

        <div className="ui-container">
          {isLoading && (
            <div className="loading">
              Loading Designer...
            </div>
          )}
          <div ref={designerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );
};

export default DesignerDemo;
