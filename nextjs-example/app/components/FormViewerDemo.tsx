'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { getDefaultFont } from 'pdfme-complete';

// Import getInputFromTemplate at module level for use in component functions
let getInputFromTemplate: any = null;

const FormViewerDemo: React.FC = () => {
  const uiRef = useRef<HTMLDivElement>(null);
  const ui = useRef<any>(null);
  const isBuilding = useRef<boolean>(false);
  const [mode, setMode] = useState<'form' | 'viewer'>(
    (localStorage.getItem('nextjs-form-viewer-mode') as 'form' | 'viewer') || 'form'
  );
  const [template, setTemplate] = useState<any>(null);
  const [inputs, setInputs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCorrupted, setIsCorrupted] = useState(false);
  const [templateKey, setTemplateKey] = useState<string>('');

  // Safe cleanup function - completely avoid destroy() method
  const safeCleanup = useCallback(() => {
    // Reset building flag to allow new builds
    isBuilding.current = false;

    // First, set ui.current to null to prevent any further operations
    const currentUi = ui.current;
    ui.current = null;

    // Skip destroy() entirely and go straight to manual cleanup
    if (uiRef.current) {
      try {
        // Use innerHTML as the primary method - it's more reliable
        uiRef.current.innerHTML = '';
      } catch (error) {
        console.warn('innerHTML cleanup failed, trying manual removal:', error);

        // Fallback: manual node removal
        try {
          const children = Array.from(uiRef.current.children);
          children.forEach(child => {
            try {
              if (child.parentNode === uiRef.current && uiRef.current) {
                uiRef.current.removeChild(child);
              }
            } catch (removeError) {
              console.warn('Failed to remove child:', removeError);
            }
          });
        } catch (manualError) {
          console.warn('Manual cleanup also failed:', manualError);
        }
      }
    }

    // Final verification
    if (uiRef.current) {
      try {
        if (uiRef.current.children.length > 0) {
          uiRef.current.textContent = '';
        }
      } catch (error) {
        console.warn('Final cleanup verification failed:', error);
      }
    }
  }, []);

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

  // Get sample template with better field types
  const getSampleTemplate = () => ({
    basePdf: {
      width: 210,
      height: 297,
      padding: [20, 10, 20, 10],
    },
    schemas: [[
      {
        name: 'title',
        type: 'text',
        content: 'Form & Viewer Demo',
        position: { x: 20, y: 20 },
        width: 150,
        height: 20,
        fontSize: 18,
        fontColor: '#2c3e50',
      },
      {
        name: 'description',
        type: 'text',
        content: 'This demonstrates the Form and Viewer components from pdfme-complete.',
        position: { x: 20, y: 50 },
        width: 170,
        height: 25,
        fontSize: 12,
        fontColor: '#34495e',
      },
      {
        name: 'name',
        type: 'text',
        content: 'Enter your name',
        position: { x: 20, y: 90 },
        width: 120,
        height: 15,
        fontSize: 12,
        fontColor: '#2980b9',
      },
      {
        name: 'email',
        type: 'text',
        content: 'your.email@example.com',
        position: { x: 20, y: 115 },
        width: 140,
        height: 15,
        fontSize: 12,
        fontColor: '#2980b9',
      },
      {
        name: 'date',
        type: 'text',
        content: new Date().toLocaleDateString(),
        position: { x: 20, y: 140 },
        width: 80,
        height: 15,
        fontSize: 12,
        fontColor: '#7f8c8d',
      },
      {
        name: 'qrcode',
        type: 'qrcode',
        content: 'https://pdfme.com',
        position: { x: 150, y: 140 },
        width: 25,
        height: 25,
      },
      {
        name: 'signature',
        type: 'text',
        content: 'Your signature here',
        position: { x: 20, y: 180 },
        width: 100,
        height: 15,
        fontSize: 10,
        fontColor: '#95a5a6',
      }
    ]]
  });

  // Get fonts data
  const getFontsData = () => {
    return getDefaultFont();
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!ui.current) return;

    try {
      const {
        generate,
        text,
        multiVariableText,
        barcodes,
        line,
        rectangle,
        ellipse,
        image,
        table,
        date,
        time,
        dateTime,
        checkbox,
        radioGroup,
        select
      } = await import('pdfme-complete');

      const template = ui.current.getTemplate();
      const inputs = ui.current.getInputs();

      console.log('Generating PDF with template:', template);
      console.log('Using inputs:', inputs);

      // Create comprehensive plugins object
      const plugins = {
        text,
        multiVariableText,
        qrcode: barcodes.qrcode,
        code128: barcodes.code128,
        ean13: barcodes.ean13,
        ean8: barcodes.ean8,
        code39: barcodes.code39,
        line,
        rectangle,
        ellipse,
        image,
        table,
        date,
        time,
        dateTime,
        checkbox,
        radioGroup,
        select
      };

      const pdf = await generate({
        template,
        inputs,
        plugins,
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
        alert('Error: The template uses an encrypted PDF.\n\nPlease load a non-encrypted template or use the sample template.');
      } else {
        alert('Error generating PDF: ' + e.message);
      }
    }
  };

  // Build UI (Form or Viewer)
  const buildUi = useCallback(async (currentMode: 'form' | 'viewer', forceRebuild = false) => {
    if (!uiRef.current) {
      console.warn('UI container not available');
      return;
    }

    // Prevent double execution unless forced
    if (isBuilding.current && !forceRebuild) {
      console.log(`Already building ${currentMode} mode, skipping...`);
      return;
    }

    try {
      isBuilding.current = true;
      setIsLoading(true);
      setError(null);
      setIsCorrupted(false); // Reset corrupted state
      // Force clean the container before building
      uiRef.current.innerHTML = '';

      // Small delay to ensure DOM is settled
      await new Promise(resolve => setTimeout(resolve, 100));

      let currentTemplate = getSampleTemplate();
      const templateFromLocal = localStorage.getItem('nextjs-form-viewer-template');

      if (templateFromLocal) {
        try {
          currentTemplate = JSON.parse(templateFromLocal);
          console.log('Loaded template from localStorage');
        } catch (e) {
          console.warn('Invalid template in localStorage, using sample template');
        }
      }

      // Import Form and Viewer dynamically with all required plugins
      const pdfmeModule = await import('pdfme-complete');
      const Form = (pdfmeModule as any).Form;
      const Viewer = (pdfmeModule as any).Viewer;
      const localGetInputFromTemplate = (pdfmeModule as any).getInputFromTemplate;
      getInputFromTemplate = localGetInputFromTemplate;
      const text = (pdfmeModule as any).text;
      const multiVariableText = (pdfmeModule as any).multiVariableText;
      const barcodes = (pdfmeModule as any).barcodes;
      const line = (pdfmeModule as any).line;
      const rectangle = (pdfmeModule as any).rectangle;
      const ellipse = (pdfmeModule as any).ellipse;
      const image = (pdfmeModule as any).image;
      const table = (pdfmeModule as any).table;
      const date = (pdfmeModule as any).date;
      const time = (pdfmeModule as any).time;
      const dateTime = (pdfmeModule as any).dateTime;
      const checkbox = (pdfmeModule as any).checkbox;
      const radioGroup = (pdfmeModule as any).radioGroup;
      const select = (pdfmeModule as any).select;

      let currentInputs = localGetInputFromTemplate(currentTemplate);
      const inputsFromLocal = localStorage.getItem('nextjs-form-viewer-inputs');

      if (inputsFromLocal) {
        try {
          currentInputs = JSON.parse(inputsFromLocal);
        } catch (e) {
          console.warn('Invalid inputs in localStorage, using default inputs');
          currentInputs = getInputFromTemplate(currentTemplate);
        }
      }

      // Ensure we have proper inputs
      if (!currentInputs || currentInputs.length === 0) {
        currentInputs = getInputFromTemplate(currentTemplate);
      }

      // Create comprehensive plugins object
      const plugins = {
        text,
        multiVariableText,
        qrcode: barcodes.qrcode,
        code128: barcodes.code128,
        ean13: barcodes.ean13,
        ean8: barcodes.ean8,
        code39: barcodes.code39,
        line,
        rectangle,
        ellipse,
        image,
        table,
        date,
        time,
        dateTime,
        checkbox,
        radioGroup,
        select
      };

      // Create a unique key for the UI instance to force recreation
      const uiKey = `${currentMode}-${Date.now()}-${JSON.stringify(currentTemplate).slice(0, 50)}`;

      ui.current = new (currentMode === 'form' ? Form : Viewer)({
        domContainer: uiRef.current,
        template: currentTemplate,
        inputs: currentInputs,
        plugins: plugins,
        options: {
          font: getFontsData(),
          lang: 'en',
          theme: {
            token: { colorPrimary: '#25c2a0' },
          },
        },
      });

      // Store the UI key for debugging
      ui.current._uiKey = uiKey;

      // Set up event handlers for Form mode
      if (currentMode === 'form' && ui.current.onChangeInput) {
        ui.current.onChangeInput((change: any) => {
          // Auto-save inputs to localStorage
          const updatedInputs = ui.current.getInputs();
          localStorage.setItem('nextjs-form-viewer-inputs', JSON.stringify(updatedInputs));
          setInputs(updatedInputs);
        });
      }

      setTemplate(currentTemplate);
      setInputs(currentInputs);
      setIsLoading(false);
      isBuilding.current = false;
    } catch (error: any) {
      console.error('Error building UI:', error);
      setError(`Error building ${currentMode} mode: ${error.message}`);
      setIsCorrupted(true);
      setIsLoading(false);
      isBuilding.current = false;

      // Force clean the container on error
      if (uiRef.current) {
        try {
          uiRef.current.innerHTML = '';
        } catch (cleanupError) {
          console.warn('Failed to clean container after error:', cleanupError);
        }
      }
    }
  }, []);

  // Handle mode change
  const onChangeMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent mode switching while loading
    if (isLoading) {
      return;
    }

    const value = e.target.value as 'form' | 'viewer';

    setMode(value);
    localStorage.setItem('nextjs-form-viewer-mode', value);

    // Set loading state to prevent rapid switches
    setIsLoading(true);
    setError(null); // Clear any previous errors

    // Use safe cleanup function (which avoids destroy())
    safeCleanup();

    // Longer delay to ensure cleanup is completely finished
    setTimeout(() => {
      isBuilding.current = false; // Reset building flag
      buildUi(value, true); // Force rebuild with new mode
    }, 400); // Increased delay
  };

  // Handle template load
  const onLoadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      readFile(e.target.files[0], 'text').then((jsonStr) => {
        try {
          const templateJson = JSON.parse(jsonStr as string);
          if (ui.current) {
            ui.current.updateTemplate(templateJson);
            setTemplate(templateJson);
            localStorage.setItem('nextjs-form-viewer-template', JSON.stringify(templateJson));
          }
        } catch (error: any) {
          alert('Invalid template file: ' + error.message);
        }
      });
    }
  };

  // Get inputs
  const onGetInputs = () => {
    if (ui.current) {
      const currentInputs = ui.current.getInputs();
      console.log('Current inputs:', currentInputs);
      alert('Inputs logged to console. Check developer tools.');
    }
  };

  // Set inputs
  const onSetInputs = () => {
    if (ui.current) {
      const prompt = window.prompt('Enter Inputs JSON String') || '';
      try {
        const json = prompt ? JSON.parse(prompt) : [{}];
        ui.current.setInputs(json);
        setInputs(json);
      } catch (e: any) {
        alert('Invalid JSON: ' + e.message);
      }
    }
  };

  // Save inputs
  const onSaveInputs = () => {
    if (ui.current) {
      const currentInputs = ui.current.getInputs();
      localStorage.setItem('nextjs-form-viewer-inputs', JSON.stringify(currentInputs));
      setInputs(currentInputs);
      console.log('Inputs saved to localStorage');
    }
  };

  // Reset inputs
  const onResetInputs = () => {
    localStorage.removeItem('nextjs-form-viewer-inputs');
    if (ui.current) {
      const template = ui.current.getTemplate();
      const defaultInputs = getInputFromTemplate(template);
      ui.current.setInputs(defaultInputs);
      setInputs(defaultInputs);
    }
  };

  // Load sample template
  const loadSampleTemplate = async () => {
    try {
      setError(null);
      const sampleTemplate = getSampleTemplate();
      setTemplate(sampleTemplate);
      localStorage.setItem('nextjs-form-viewer-template', JSON.stringify(sampleTemplate));

      // Import getInputFromTemplate dynamically
      const { getInputFromTemplate } = await import('pdfme-complete');

      // Generate inputs for the new template
      const sampleInputs = getInputFromTemplate(sampleTemplate as any);
      setInputs(sampleInputs);
      localStorage.setItem('nextjs-form-viewer-inputs', JSON.stringify(sampleInputs));

      // Rebuild UI with new template
      await buildUi(mode);
    } catch (error: any) {
      console.error('Error loading sample template:', error);
      setError('Failed to load sample template: ' + error.message);
    }
  };

  // Force rebuild UI with current template and mode
  const forceRebuildUI = useCallback(async () => {
    console.log('Force rebuilding UI...');
    isBuilding.current = false; // Reset building flag
    safeCleanup();
    await new Promise(resolve => setTimeout(resolve, 300));
    await buildUi(mode, true); // Force rebuild
  }, [mode, buildUi, safeCleanup]);

  // Load sample files from public directory
  const loadSampleFile = async (templateFile: string, inputsFile: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Force cleanup before loading new template
      safeCleanup();

      // Fetch template
      const templateResponse = await fetch(`/${templateFile}`);
      if (!templateResponse.ok) throw new Error(`Failed to load ${templateFile}`);
      const templateData = await templateResponse.json();

      // Fetch inputs
      const inputsResponse = await fetch(`/${inputsFile}`);
      if (!inputsResponse.ok) throw new Error(`Failed to load ${inputsFile}`);
      const inputsData = await inputsResponse.json();

      // Save to state and localStorage
      setTemplate(templateData);
      setInputs(inputsData);
      setTemplateKey(`${templateFile}-${Date.now()}`); // Force UI update
      localStorage.setItem('nextjs-form-viewer-template', JSON.stringify(templateData));
      localStorage.setItem('nextjs-form-viewer-inputs', JSON.stringify(inputsData));

      // Wait longer for state updates to complete
      await new Promise(resolve => setTimeout(resolve, 400));

      // Force rebuild UI with new template
      await forceRebuildUI();

      console.log(`Loaded ${templateFile} and ${inputsFile} successfully`);
    } catch (error: any) {
      console.error('Error loading sample file:', error);
      setError('Failed to load sample file: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    buildUi(mode);
    return () => {
      safeCleanup();
    };
  }, [mode, buildUi, safeCleanup]);

  // Watch for template changes and rebuild UI
  useEffect(() => {
    if (templateKey && !isLoading) {
      console.log('Template changed, force rebuilding UI...');
      isBuilding.current = false; // Reset building flag
      buildUi(mode, true); // Force rebuild
    }
  }, [templateKey, mode, buildUi, isLoading]);

  return (
    <div>
      <div className="description">
        <h3>📝 Form & Viewer</h3>
        <p>Fill out forms or view PDF templates. Switch between Form (editable) and Viewer (read-only) modes.</p>

        <div style={{ backgroundColor: '#e7f3ff', padding: '15px', borderRadius: '5px', marginTop: '15px', border: '1px solid #b3d9ff' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>🎯 How to Test:</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#0066cc' }}>
            <li><strong>Load a Sample:</strong> Click "Load Order Form" or "Load Invoice Template"</li>
            <li><strong>Form Mode:</strong> Edit field values interactively</li>
            <li><strong>Viewer Mode:</strong> Switch to see read-only preview</li>
            <li><strong>Generate PDF:</strong> Create final PDF document</li>
            <li><strong>Custom Template:</strong> Upload your own JSON template file</li>
          </ol>
        </div>
      </div>

      <div className="component-container">
        <div className="controls">
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="form"
                checked={mode === 'form'}
                onChange={onChangeMode}
              />
              📝 Form Mode (Editable)
            </label>
            <label>
              <input
                type="radio"
                value="viewer"
                checked={mode === 'viewer'}
                onChange={onChangeMode}
              />
              👁️ Viewer Mode (Read-only)
            </label>
          </div>

          {(error || isCorrupted) && (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => {
                  console.log('Force reset triggered');
                  setError(null);
                  setIsCorrupted(false);
                  setIsLoading(false);
                  isBuilding.current = false;
                  safeCleanup();
                  setTimeout(() => buildUi(mode, true), 500); // Force rebuild
                }}
                className="btn btn-danger"
                style={{ fontSize: '12px', padding: '5px 10px' }}
              >
                🔄 Force Reset
              </button>
              <span style={{ marginLeft: '10px', fontSize: '12px', color: '#dc3545' }}>
                Click if switching modes fails
              </span>
            </div>
          )}

          <div className="button-group">
            <button
              onClick={loadSampleTemplate}
              className="btn btn-primary"
            >
              📄 Load Sample Template
            </button>

            <label className="file-input-label">
              📋 Load Template
              <input
                type="file"
                accept="application/json"
                onChange={onLoadTemplate}
              />
            </label>

            <button
              onClick={onGetInputs}
              className="btn btn-info"
            >
              📊 Get Inputs
            </button>

            <button
              onClick={onSetInputs}
              className="btn btn-warning"
            >
              📝 Set Inputs
            </button>

            <button
              onClick={onSaveInputs}
              className="btn btn-success"
            >
              💾 Save Inputs
            </button>

            <button
              onClick={onResetInputs}
              className="btn btn-secondary"
            >
              🔄 Reset Inputs
            </button>

            <button
              onClick={generatePDF}
              className="btn btn-danger"
            >
              🎯 Generate PDF
            </button>
          </div>

          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📁 Sample Templates</h4>
            <div className="button-group">
              <button
                onClick={() => loadSampleFile('sample-template.json', 'sample-inputs.json')}
                className="btn btn-info"
                disabled={isLoading}
              >
                📄 Load Order Form
              </button>

              <button
                onClick={() => loadSampleFile('invoice-template.json', 'invoice-inputs.json')}
                className="btn btn-success"
                disabled={isLoading}
              >
                🧾 Load Invoice Template
              </button>
            </div>
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
              These sample templates demonstrate different use cases and field types.
            </p>
          </div>

          {error && (
            <div className="error" style={{ marginTop: '1rem' }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="ui-container">
          {isLoading && (
            <div className="loading">
              Loading {mode === 'form' ? 'Form' : 'Viewer'}...
            </div>
          )}
          <div
            key={`ui-container-${mode}-${templateKey}`}
            ref={uiRef}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default FormViewerDemo;
