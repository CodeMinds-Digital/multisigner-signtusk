# PDFme Complete - Next.js Example

This is a comprehensive Next.js example demonstrating how to use the **pdfme-complete** package to create, edit, and generate PDF documents with a unified API.

## 🚀 Features

- **PDF Generation**: Generate PDFs with text, images, barcodes, tables, and more
- **Visual Designer**: Drag-and-drop template editor for creating PDF layouts
- **Form Interface**: Auto-generated forms for data input based on template schemas
- **PDF Viewer**: Preview component to see the final rendered output
- **TypeScript Support**: Full TypeScript integration for better development experience
- **SSR Optimized**: Proper server-side rendering handling with Next.js
- **Dynamic Imports**: Optimized bundle splitting for better performance

## 📦 What's Included

### Components

1. **WorkingPDFDemo** - Real PDF generation with multiple field types
2. **DesignerDemo** - Visual template editor with drag-and-drop functionality
3. **FormViewerDemo** - Form filling and PDF viewing modes
4. **AllFieldTypesDemo** - Showcase of all available field types

### Field Types Supported

- Text Fields
- Multi-Variable Text
- QR Codes
- Barcodes (Code128, etc.)
- Images
- SVG Graphics
- Rectangles
- Ellipses
- Lines
- Tables
- Read-only Fields

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Usage

### Basic PDF Generation

```typescript
import { generate, text, barcodes, getDefaultFont } from 'pdfme-complete';

const template = {
  basePdf: BLANK_PDF,
  schemas: [[
    {
      name: 'title',
      type: 'text',
      content: 'Hello World',
      position: { x: 20, y: 20 },
      width: 100,
      height: 20,
    }
  ]]
};

const inputs = [{ title: 'My Document' }];
const plugins = { text, qrcode: barcodes.qrcode };
const font = await getDefaultFont();

const pdf = await generate({
  template,
  inputs,
  plugins,
  options: { font }
});
```

### Using React Components

```typescript
import { Designer, Form, Viewer } from 'pdfme-complete';

// Designer Component
<Designer
  template={template}
  onChangeTemplate={setTemplate}
  options={{ font }}
  plugins={plugins}
/>

// Form Component
<Form
  template={template}
  inputs={inputs}
  onChangeInputs={setInputs}
  options={{ font }}
  plugins={plugins}
/>

// Viewer Component
<Viewer
  template={template}
  inputs={inputs}
  options={{ font }}
  plugins={plugins}
/>
```

## 🔧 Next.js Specific Considerations

### Client-Side Only Components

Since PDF libraries use browser APIs, components are loaded client-side only:

```typescript
import dynamic from 'next/dynamic';

const PDFComponent = dynamic(() => import('./PDFComponent'), {
  ssr: false,
  loading: () => <div>Loading PDF...</div>
});
```

### Webpack Configuration

The `next.config.js` includes necessary configurations for PDF libraries:

```javascript
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        buffer: require.resolve('buffer'),
        stream: false,
        crypto: false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};
```

## 📁 Project Structure

```
nextjs-example/
├── app/
│   ├── components/
│   │   ├── WorkingPDFDemo.tsx
│   │   ├── DesignerDemo.tsx
│   │   ├── FormViewerDemo.tsx
│   │   └── AllFieldTypesDemo.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── public/
│   └── sample.pdf
├── package.json
├── next.config.js
├── tsconfig.json
└── README.md
```

## 🎯 Key Benefits

- **Unified API**: Single import for all PDF functionality
- **TypeScript Support**: Full type safety and IntelliSense
- **Next.js Optimized**: Proper SSR handling and performance optimization
- **Smaller Bundle**: Optimized packaging reduces bundle size
- **Version Consistency**: No conflicts between different packages
- **Ready Examples**: Working examples to get started immediately

## 🔍 Troubleshooting

### Common Issues

1. **PDF not loading**: Ensure the PDF file is in the `public` folder
2. **Build errors**: Check that all dynamic imports are properly configured
3. **Type errors**: Make sure TypeScript types are properly imported

### Browser Compatibility

- Modern browsers with ES6+ support
- PDF.js compatibility requirements
- Canvas API support for rendering

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [PDFme Documentation](https://pdfme.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🤝 Contributing

Feel free to contribute to this example by:
- Adding new field type demonstrations
- Improving TypeScript types
- Enhancing the UI/UX
- Adding more comprehensive examples

## 📄 License

This example is licensed under the MIT License.
