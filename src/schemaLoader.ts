import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';

// Get the correct project root path
const getProjectRoot = () => {
    // When running from dist folder, we need to go up two levels to get to project root
    // This handles both development and production scenarios
    const projectRoot = path.resolve(__dirname, '../');
    
    // Check if schemas folder exists in the resolved path
    const schemasPath = path.join(projectRoot, 'schemas');
    try {
        // This is a synchronous check which is fine for initialization
        if (fsSync.existsSync(schemasPath)) {
            return projectRoot;
        }
        
        // If schemas directory doesn't exist at default location, try parent directory
        // This handles cases where the app might be run from a subdirectory
        const alternativePath = path.resolve(projectRoot, '../');
        if (fsSync.existsSync(path.join(alternativePath, 'schemas'))) {
            return alternativePath;
        }
        
        // If still not found, log the issue but return the original path
        console.warn(`Warning: schemas directory not found at ${schemasPath} or ${path.join(alternativePath, 'schemas')}`);
        
        // Create the schemas directory if it doesn't exist
        fsSync.mkdirSync(schemasPath, { recursive: true });
        
        return projectRoot;
    } catch (error) {
        console.warn('Error checking for schemas directory:', error);
        return projectRoot;
    }
};

export async function loadSchema(schemaName: string): Promise<Record<string, string>> {
    const schemaPath = path.join(getProjectRoot(), 'schemas', `${schemaName}.json`);
    try {
        const schemaFile = await fs.readFile(schemaPath, 'utf-8');
        return JSON.parse(schemaFile);
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`Schema file not found: ${schemaName}`);
        } else {
            throw new Error(`Invalid JSON in schema file: ${schemaName}`);
        }
    }
}

export async function listSchemas(): Promise<string[]> {
    const schemasDir = path.join(getProjectRoot(), 'schemas');
    const files = await fs.readdir(schemasDir);
    return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
}

export async function viewSchema(schemaName: string): Promise<string> {
    const schemaPath = path.join(getProjectRoot(), 'schemas', `${schemaName}.json`);
    try {
        const schemaFile = await fs.readFile(schemaPath, 'utf-8');
        return schemaFile;
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`Schema file not found: ${schemaName}`);
        } else {
            throw new Error(`Error reading schema file: ${schemaName}`);
        }
    }
}

/**
 * Load a structured schema definition
 */
export async function loadStructuredSchema(schemaName: string): Promise<ExtractorSchema> {
    const schemaPath = path.join(getProjectRoot(), 'schemas', `${schemaName}.json`);
    try {
        const schemaFile = await fs.readFile(schemaPath, 'utf-8');
        const schema = JSON.parse(schemaFile);
        
        // Check if it's already a structured schema or needs to be converted
        if (isStructuredSchema(schema)) {
            return parseStructuredSchema(schema);
        } else {
            // If it's a simple selector map or old format, convert it
            return convertToStructuredSchema(schema);
        }
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`Schema file not found: ${schemaName}`);
        } else {
            throw new Error(`Invalid schema file: ${schemaName} - ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Check if the loaded schema is already in structured format
 */
function isStructuredSchema(schema: any): boolean {
    // Check if schema has fields like "type", "properties", etc. that indicate a structured schema
    return (
        schema && 
        (schema.type || schema.selectors || schema.structure || schema.properties)
    );
}

/**
 * Parse a structured schema definition from the loaded JSON
 */
function parseStructuredSchema(schema: any): ExtractorSchema {
    // Handle various structured schema formats
    
    // Case 1: Already in the expected format with selectors and structure
    if (schema.selectors && schema.structure) {
        return schema as ExtractorSchema;
    }
    
    // Case 2: Only has a structure definition without selectors
    if (schema.type || schema.properties) {
        const selectors: Record<string, string> = {};
        const structure: Record<string, StructuredSchema> = {};
        
        if (schema.properties) {
            // For each property, extract the selector if available
            for (const [field, propSchema] of Object.entries(schema.properties)) {
                if (propSchema && typeof propSchema === 'object' && 
                    'selector' in propSchema && typeof propSchema.selector === 'string') {
                    // Safely extract the selector property
                    selectors[field] = propSchema.selector;
                    
                    // Create a copy without the selector property for the structure
                    // Using type assertion after checking 'selector' exists
                    const { selector, ...structureProp } = propSchema as { selector: string; [key: string]: any };
                    structure[field] = structureProp as StructuredSchema;
                } else {
                    structure[field] = propSchema as StructuredSchema;
                }
            }
            
            return { selectors, structure };
        }
        
        // Root schema is a single field definition
        return {
            selectors: {},
            structure: { 'root': schema as StructuredSchema }
        };
    }
    
    // Case 3: Old format with fields
    if (schema.fields) {
        const selectors: Record<string, string> = {};
        const structure: Record<string, StructuredSchema> = {};
        
        for (const [field, selectorValue] of Object.entries(schema.fields)) {
            // Handle string selectors
            if (typeof selectorValue === 'string') {
                selectors[field] = selectorValue;
                structure[field] = {
                    type: 'string',
                    description: `Extracted from ${selectorValue}`,
                    nullable: true
                };
            } 
            // Handle object selectors with proper type checking
            else if (selectorValue && typeof selectorValue === 'object' && 
                     'selector' in selectorValue && typeof selectorValue.selector === 'string') {
                
                // Safe access with type assertions after checks
                const selector = selectorValue as { 
                    selector: string;
                    type?: string;
                    description?: string;
                    nullable?: boolean;
                };
                
                selectors[field] = selector.selector;
                structure[field] = {
                    type: (selector.type as SchemaType) || 'string',
                    description: selector.description || `Extracted from ${selector.selector}`,
                    nullable: selector.nullable !== undefined ? selector.nullable : true
                };
            }
        }
        
        return { selectors, structure };
    }
    
    // Default case: If we can't determine the format, treat as a simple selector map
    return convertToStructuredSchema(schema);
}

/**
 * Convert a simple selector map to a structured schema
 */
function convertToStructuredSchema(schema: Record<string, string>): ExtractorSchema {
    const selectors: Record<string, string> = {};
    const structure: Record<string, StructuredSchema> = {};
    
    for (const [field, value] of Object.entries(schema)) {
        // If the value looks like a CSS selector
        if (typeof value === 'string' && (value.includes('.') || value.includes('#') || value.includes('['))) {
            selectors[field] = value;
            structure[field] = {
                type: 'string', // Default to string type
                description: `Extracted from ${value}`,
                nullable: true
            };
        } 
        // If value is "string" or other type indicator
        else if (typeof value === 'string' && ['string', 'number', 'boolean', 'object', 'array'].includes(value)) {
            structure[field] = {
                type: value as SchemaType,
                nullable: true
            };
        }
    }
    
    return { selectors, structure };
}