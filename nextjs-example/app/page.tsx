'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import components that use browser APIs
const WorkingPDFDemo = dynamic(() => import('./components/WorkingPDFDemo'), {
  ssr: false,
  loading: () => <div className="loading">Loading PDF Demo...</div>
});

const DesignerDemo = dynamic(() => import('./components/DesignerDemo'), {
  ssr: false,
  loading: () => <div className="loading">Loading Designer...</div>
});

const FormViewerDemo = dynamic(() => import('./components/FormViewerDemo'), {
  ssr: false,
  loading: () => <div className="loading">Loading Form/Viewer...</div>
});

const AllFieldTypesDemo = dynamic(() => import('./components/AllFieldTypesDemo'), {
  ssr: false,
  loading: () => <div className="loading">Loading Field Types Demo...</div>
});

const ManipulatorDemo = dynamic(() => import('./components/ManipulatorDemo'), {
  ssr: false,
  loading: () => <div className="loading">Loading Manipulator Demo...</div>
});

const ConverterDemo = dynamic(() => import('./components/ConverterDemo'), {
  ssr: false,
  loading: () => <div className="loading">Loading Converter Demo...</div>
});

const ConsoleFilter = dynamic(() => import('./components/ConsoleFilter'), {
  ssr: false
});

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '📋 Overview', description: 'Introduction to pdfme-complete' },
    { id: 'api', label: '🔧 Unified API', description: 'Single import for all functionality' },
    { id: 'components', label: '⚛️ React Components', description: 'Designer, Form, and Viewer' },
    { id: 'benefits', label: '✨ Benefits', description: 'Why use pdfme-complete' },
    { id: 'working', label: '🎯 Working Demo', description: 'Real PDF generation' },
    { id: 'designer', label: '🎨 Designer', description: 'Visual template editor' },
    { id: 'form-viewer', label: '📝 Form & Viewer', description: 'Fill forms and view PDFs' },
    { id: 'demo', label: '🚀 Field Types', description: 'All available field types' },
    { id: 'manipulator', label: '🔧 Manipulator', description: 'Merge, split, rotate PDFs' },
    { id: 'converter', label: '🔄 Converter', description: 'PDF ↔ Image conversion' },
  ];

  return (
    <div className="container">
      <ConsoleFilter />
      <nav className="nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.description}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <div>
          <div className="description">
            <h3>🎯 PDFme Complete - Next.js Integration</h3>
            <p>
              This Next.js example demonstrates how to use the <strong>pdfme-complete</strong> package
              to create, edit, and generate PDF documents with a unified API. The package combines
              all pdfme functionality into a single, easy-to-use library.
            </p>
          </div>
          <div className="component-container">
            <div style={{ padding: '2rem' }}>
              <h4>🚀 What&apos;s Included</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                  <h5>📄 PDF Generation</h5>
                  <p>Generate PDFs with text, images, barcodes, tables, and more using a simple API.</p>
                </div>
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                  <h5>🎨 Visual Designer</h5>
                  <p>Drag-and-drop template editor for creating PDF layouts visually.</p>
                </div>
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                  <h5>📝 Form Interface</h5>
                  <p>Auto-generated forms for data input based on template schemas.</p>
                </div>
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                  <h5>👁️ PDF Viewer</h5>
                  <p>Preview component to see the final rendered PDF output.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div>
          <div className="description">
            <h3>Unified API</h3>
            <p>
              Instead of multiple imports from different packages, you get a single, clean import
              that includes everything you need for PDF operations.
            </p>
          </div>
          <div className="component-container" style={{ padding: '2rem' }}>
            <h4>❌ Before (Multiple Packages):</h4>
            <div className="code-block">
              {`import { generate } from '@pdfme/generator';
import { text, barcodes } from '@pdfme/schemas';
import { Designer, Form, Viewer } from '@pdfme/ui';
import { merge, split } from '@pdfme/manipulator';
import { pdf2img } from '@pdfme/converter';
import { BLANK_PDF, getDefaultFont } from '@pdfme/common';`}
            </div>

            <h4 style={{ marginTop: '2rem' }}>✅ After (Single Package):</h4>
            <div className="code-block">
              {`import { 
  generate, 
  text, 
  barcodes, 
  Designer, 
  Form, 
  Viewer, 
  merge, 
  split, 
  pdf2img, 
  BLANK_PDF, 
  getDefaultFont 
} from 'pdfme-complete';`}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'components' && (
        <div>
          <div className="description">
            <h3>React Components</h3>
            <p>
              The package includes three main React components for different use cases,
              all optimized for Next.js with proper SSR handling.
            </p>
          </div>
          <div className="component-container" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h4>🎨 Designer Component</h4>
              <p>Visual template editor for creating PDF templates with drag-and-drop functionality.</p>
              <div className="code-block">
                {`<Designer
  template={template}
  onChangeTemplate={setTemplate}
  options={{ font }}
  plugins={plugins}
/>`}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4>📝 Form Component</h4>
              <p>Data input interface that automatically generates form fields based on template schema.</p>
              <div className="code-block">
                {`<Form
  template={template}
  inputs={inputs}
  onChangeInputs={setInputs}
  options={{ font }}
  plugins={plugins}
/>`}
              </div>
            </div>

            <div>
              <h4>👁️ Viewer Component</h4>
              <p>PDF preview component that shows the final rendered output.</p>
              <div className="code-block">
                {`<Viewer
  template={template}
  inputs={inputs}
  options={{ font }}
  plugins={plugins}
/>`}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'benefits' && (
        <div>
          <div className="description">
            <h3>Benefits of pdfme-complete</h3>
            <p>
              Discover why pdfme-complete is the best choice for PDF operations in Next.js applications.
            </p>
          </div>
          <div className="component-container">
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <h4>🎯 Simplified Development</h4>
                  <p>One package, one import, everything you need for PDF operations.</p>
                </div>

                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <h4>📦 Smaller Bundle</h4>
                  <p>Optimized packaging reduces overall bundle size compared to separate packages.</p>
                </div>

                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <h4>🔄 Version Consistency</h4>
                  <p>No more version conflicts between different pdfme packages.</p>
                </div>

                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <h4>⚡ Better Performance</h4>
                  <p>Optimized bundle with shared dependencies and tree-shaking support.</p>
                </div>

                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <h4>🎁 Ready Examples</h4>
                  <p>Working Next.js and React examples included to get you started immediately.</p>
                </div>

                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <h4>🛠️ Next.js Optimized</h4>
                  <p>Proper SSR handling and dynamic imports for seamless Next.js integration.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'working' && <WorkingPDFDemo />}
      {activeTab === 'designer' && <DesignerDemo />}
      {activeTab === 'form-viewer' && <FormViewerDemo />}
      {activeTab === 'demo' && <AllFieldTypesDemo />}
      {activeTab === 'manipulator' && <ManipulatorDemo />}
      {activeTab === 'converter' && <ConverterDemo />}
    </div>
  );
}
