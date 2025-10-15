import Handlebars from 'handlebars';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: Record<string, any>;
}

interface CompiledTemplate {
  subject: string;
  html: string;
  text?: string;
  usedVariables: string[];
  missingVariables: string[];
}

interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
}

export class TemplateCompiler {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Compile template with provided data
   */
  compile(template: EmailTemplate, data: Record<string, any> = {}): CompiledTemplate {
    try {
      // Extract variables from template
      const subjectVars = this.extractVariables(template.subject);
      const htmlVars = this.extractVariables(template.html_content);
      const textVars = template.text_content ? this.extractVariables(template.text_content) : [];
      
      const allVariables = [...new Set([...subjectVars, ...htmlVars, ...textVars])];
      const providedVariables = Object.keys(data);
      const missingVariables = allVariables.filter(v => !(v in data));

      // Merge with default variables from template
      const mergedData = {
        ...template.variables,
        ...data,
        // Add system variables
        current_date: new Date().toLocaleDateString(),
        current_year: new Date().getFullYear(),
        timestamp: new Date().toISOString()
      };

      // Compile templates
      const subjectTemplate = this.handlebars.compile(template.subject);
      const htmlTemplate = this.handlebars.compile(template.html_content);
      const textTemplate = template.text_content 
        ? this.handlebars.compile(template.text_content) 
        : null;

      return {
        subject: subjectTemplate(mergedData),
        html: htmlTemplate(mergedData),
        text: textTemplate ? textTemplate(mergedData) : undefined,
        usedVariables: providedVariables.filter(v => allVariables.includes(v)),
        missingVariables
      };
    } catch (error) {
      throw new Error(`Template compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate template syntax and variables
   */
  validateTemplate(template: Partial<EmailTemplate>): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables: string[] = [];

    try {
      // Validate subject
      if (template.subject) {
        try {
          this.handlebars.compile(template.subject);
          variables.push(...this.extractVariables(template.subject));
        } catch (error) {
          errors.push(`Subject template error: ${error instanceof Error ? error.message : 'Invalid syntax'}`);
        }
      }

      // Validate HTML content
      if (template.html_content) {
        try {
          this.handlebars.compile(template.html_content);
          variables.push(...this.extractVariables(template.html_content));
        } catch (error) {
          errors.push(`HTML template error: ${error instanceof Error ? error.message : 'Invalid syntax'}`);
        }
      }

      // Validate text content
      if (template.text_content) {
        try {
          this.handlebars.compile(template.text_content);
          variables.push(...this.extractVariables(template.text_content));
        } catch (error) {
          errors.push(`Text template error: ${error instanceof Error ? error.message : 'Invalid syntax'}`);
        }
      }

      // Check for common issues
      const uniqueVariables = [...new Set(variables)];
      
      // Warning for unused variables in template.variables
      if (template.variables) {
        const templateVars = Object.keys(template.variables);
        const unusedVars = templateVars.filter(v => !uniqueVariables.includes(v));
        if (unusedVars.length > 0) {
          warnings.push(`Unused variables defined: ${unusedVars.join(', ')}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        variables: uniqueVariables
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        variables
      };
    }
  }

  /**
   * Generate preview with sample data
   */
  generatePreview(template: EmailTemplate, sampleData?: Record<string, any>): CompiledTemplate {
    const variables = this.extractVariables(template.html_content + ' ' + template.subject);
    
    // Generate sample data for missing variables
    const defaultSampleData = this.generateSampleData(variables);
    const mergedSampleData = { ...defaultSampleData, ...sampleData };

    return this.compile(template, mergedSampleData);
  }

  /**
   * Extract variables from template string
   */
  private extractVariables(templateString: string): string[] {
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(templateString)) !== null) {
      const variable = match[1].trim();
      // Handle simple variables (not helpers or complex expressions)
      if (!variable.includes(' ') && !variable.includes('(')) {
        variables.push(variable);
      }
    }

    return [...new Set(variables)];
  }

  /**
   * Generate sample data for variables
   */
  private generateSampleData(variables: string[]): Record<string, any> {
    const sampleData: Record<string, any> = {};

    variables.forEach(variable => {
      switch (variable.toLowerCase()) {
        case 'name':
        case 'first_name':
        case 'firstname':
          sampleData[variable] = 'John';
          break;
        case 'last_name':
        case 'lastname':
          sampleData[variable] = 'Doe';
          break;
        case 'email':
          sampleData[variable] = 'john.doe@example.com';
          break;
        case 'company':
        case 'company_name':
          sampleData[variable] = 'Acme Corp';
          break;
        case 'phone':
        case 'phone_number':
          sampleData[variable] = '+1 (555) 123-4567';
          break;
        case 'address':
          sampleData[variable] = '123 Main St, Anytown, USA';
          break;
        case 'amount':
        case 'price':
          sampleData[variable] = '$99.99';
          break;
        case 'date':
          sampleData[variable] = new Date().toLocaleDateString();
          break;
        case 'url':
        case 'link':
          sampleData[variable] = 'https://example.com';
          break;
        default:
          // Generate based on variable name pattern
          if (variable.includes('url') || variable.includes('link')) {
            sampleData[variable] = 'https://example.com';
          } else if (variable.includes('date')) {
            sampleData[variable] = new Date().toLocaleDateString();
          } else if (variable.includes('number') || variable.includes('count')) {
            sampleData[variable] = '42';
          } else {
            sampleData[variable] = `Sample ${variable}`;
          }
      }
    });

    return sampleData;
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Date formatting helper
    this.handlebars.registerHelper('formatDate', (date: string | Date, format: string = 'MM/DD/YYYY') => {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      
      switch (format.toLowerCase()) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'iso':
          return d.toISOString();
        default:
          return d.toLocaleDateString();
      }
    });

    // Currency formatting helper
    this.handlebars.registerHelper('currency', (amount: number | string, currency: string = 'USD') => {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(num)) return amount;
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
      }).format(num);
    });

    // Uppercase helper
    this.handlebars.registerHelper('upper', (str: string) => {
      return typeof str === 'string' ? str.toUpperCase() : str;
    });

    // Lowercase helper
    this.handlebars.registerHelper('lower', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : str;
    });

    // Capitalize helper
    this.handlebars.registerHelper('capitalize', (str: string) => {
      if (typeof str !== 'string') return str;
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Conditional helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);

    // Default value helper
    this.handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value || defaultValue;
    });

    // Truncate helper
    this.handlebars.registerHelper('truncate', (str: string, length: number = 50) => {
      if (typeof str !== 'string') return str;
      return str.length > length ? str.substring(0, length) + '...' : str;
    });

    // URL encoding helper
    this.handlebars.registerHelper('urlEncode', (str: string) => {
      return typeof str === 'string' ? encodeURIComponent(str) : str;
    });
  }
}
