// Mock for @react-email/render to prevent Html import issues during SSG
export const render = (component: any): string => {
  // Simple fallback for server-side rendering
  if (typeof component === 'string') {
    return component
  }
  
  // Return a basic HTML string for any React component
  return '<div>Email content rendered</div>'
}

export default { render }
