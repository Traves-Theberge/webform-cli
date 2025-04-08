import cheerio from 'cheerio';
import type { ExtractorSchema, StructuredOutput, SchemaType, StructuredSchema } from './types';

export function extractData(html: cheerio.CheerioAPI, schema: Record<string, string>): Record<string, any> {
    const extractedData: Record<string, any> = {};

    for (const [fieldName, selector] of Object.entries(schema)) {
        try {
            const element = html(selector);
            
            // Handle arrays - if multiple elements match, collect all values
            if (element.length > 1) {
                extractedData[fieldName] = element.map((i, el) => html(el).text().trim()).get();
            } else {
                extractedData[fieldName] = element.length > 0 ? element.text().trim() : null;
            }
        } catch (error) {
            console.warn(`Failed to extract data for '${fieldName}' with selector '${selector}'`);
            extractedData[fieldName] = null;
        }
    }

    return extractedData;
}

/**
 * Extract data using a structured schema definition
 */
export function extractStructuredData(
    html: cheerio.CheerioAPI, 
    schema: ExtractorSchema
): StructuredOutput {
    // Extract raw data using selectors
    const rawData: Record<string, any> = {};
    
    // Process each selector
    for (const [fieldName, selector] of Object.entries(schema.selectors)) {
        try {
            const element = html(selector);
            
            // Debug output for troubleshooting
            console.log(`Field: ${fieldName}, Element found: ${element.length > 0}, Selector: ${selector}`);
            
            // Special case for URL fields
            if (fieldName.toLowerCase().includes('url')) {
                if (element.length > 1) {
                    rawData[fieldName] = element.map((i, el) => html(el).attr('href')).get();
                } else {
                    const href = element.attr('href');
                    console.log(`URL attribute for ${fieldName}: ${href}`);
                    rawData[fieldName] = href || null;
                }
            }
            // Special case for comment count
            else if (fieldName.toLowerCase().includes('comment')) {
                const text = element.text().trim();
                // Try to extract just the number
                const matches = text.match(/(\d+)\s+comments?/);
                if (matches && matches[1]) {
                    rawData[fieldName] = matches[1];
                } else {
                    rawData[fieldName] = text;
                }
            }
            // Handle arrays - if multiple elements match, collect all values
            else if (element.length > 1) {
                rawData[fieldName] = element.map((i, el) => html(el).text().trim()).get();
            } else {
                rawData[fieldName] = element.length > 0 ? element.text().trim() : null;
            }
        } catch (error) {
            console.warn(`Failed to extract data for '${fieldName}' with selector '${selector}'`);
            rawData[fieldName] = null;
        }
    }
    
    // If no structure is defined, return raw data
    if (!schema.structure) {
        return addMetadata(rawData);
    }
    
    // Convert and validate according to schema structure
    const structuredData = validateAndStructure(rawData, schema.structure);
    
    return addMetadata(structuredData);
}

/**
 * Add metadata to the extracted data
 */
function addMetadata(data: Record<string, any>): StructuredOutput {
    return {
        ...data,
        _metadata: {
            schemaVersion: '1.0',
            extractedAt: new Date().toISOString()
        }
    };
}

/**
 * Validate and structure data according to schema
 */
function validateAndStructure(
    data: Record<string, any>,
    schema: Record<string, StructuredSchema>
): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [field, schemaType] of Object.entries(schema)) {
        const rawValue = data[field];
        
        // Skip if field is not in raw data and not required
        if (rawValue === undefined && !schemaType.required?.includes(field)) {
            continue;
        }
        
        // Handle null values
        if (rawValue === null) {
            if (schemaType.nullable) {
                result[field] = null;
            }
            continue;
        }
        
        // Convert and validate according to type
        result[field] = convertToType(rawValue, schemaType);
    }
    
    return result;
}

/**
 * Convert a value to the specified schema type
 */
function convertToType(value: any, schema: StructuredSchema): any {
    switch (schema.type) {
        case 'string':
            return String(value);
            
        case 'number':
            const num = Number(value);
            return isNaN(num) ? 0 : num;
            
        case 'boolean':
            if (typeof value === 'string') {
                return ['true', 'yes', '1'].includes(value.toLowerCase());
            }
            return Boolean(value);
            
        case 'array':
            if (!Array.isArray(value)) {
                value = value ? [value] : [];
            }
            
            // Validate array constraints
            if (schema.maxItems && value.length > schema.maxItems) {
                value = value.slice(0, schema.maxItems);
            }
            
            // Convert array items if schema.items is defined
            if (schema.items) {
                return value.map((item: any) => convertToType(item, schema.items!));
            }
            return value;
            
        case 'object':
            if (typeof value !== 'object' || value === null) {
                value = {};
            }
            
            // Convert object properties if schema.properties is defined
            if (schema.properties) {
                const result: Record<string, any> = {};
                for (const [propName, propSchema] of Object.entries(schema.properties)) {
                    if (value[propName] !== undefined || propSchema.required?.includes(propName)) {
                        result[propName] = convertToType(value[propName], propSchema);
                    }
                }
                return result;
            }
            return value;
            
        default:
            return value;
    }
}