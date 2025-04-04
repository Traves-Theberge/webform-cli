// Basic schema type for CSS selectors
interface Schema {
  [fieldName: string]: string; // Maps field names to CSS selectors
}

// Supported data types for schema validation
type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

// Schema definition for structured outputs
interface StructuredSchema {
  type: SchemaType;
  format?: string;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  maxItems?: number;
  minItems?: number;
  properties?: {
    [key: string]: StructuredSchema;
  };
  required?: string[];
  propertyOrdering?: string[];
  items?: StructuredSchema;
  selector?: string; // CSS selector to extract the data
}

// Schema mapping configuration for extraction
interface SchemaConfig {
  fields: {
    [key: string]: string | {
      selector: string;
      schema?: StructuredSchema;
    };
  };
}

// Combined schema that includes both extraction and validation
interface ExtractorSchema {
  selectors: Schema;
  structure?: {
    [key: string]: StructuredSchema;
  };
}

// Output of the structured data processing
interface StructuredOutput {
  [key: string]: any;
  _metadata?: {
    schemaVersion: string;
    extractedAt: string;
    source?: string;
  };
}