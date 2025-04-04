import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractStructuredData } from './extractor';

export async function fetchHTML(url: string): Promise<string> {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch HTML from ${url}: ${errorMessage}`);
    }
}

export function parseHTML(html: string): cheerio.Root {
    return cheerio.load(html);
}

export function extractData(html: string, schema: Record<string, string>): Record<string, string> {
    const $ = cheerio.load(html);
    const result: Record<string, string> = {};
    
    // Extract data based on schema selectors
    for (const [key, selector] of Object.entries(schema)) {
        try {
            // Get text from the selected elements and clean it
            const value = $(selector).text().trim();
            result[key] = value;
        } catch (error) {
            console.warn(`Failed to extract data for '${key}' with selector '${selector}'`);
            result[key] = '';
        }
    }
    
    return result;
}

/**
 * Extract data from HTML based on structured schema definition
 */
export function extractDataWithStructuredSchema(
    html: string, 
    schema: ExtractorSchema
): StructuredOutput {
    const $ = cheerio.load(html);
    // Convert $ to any to bypass the type checking issue between Root and CheerioAPI
    return extractStructuredData($ as any, schema);
}

/**
 * Convert a traditional schema to a structured schema
 * @param schema Simple selector-based schema
 * @param defaultType Default data type for fields
 * @returns Structured schema for extraction and validation
 */
export function convertToStructuredSchema(
    schema: Record<string, string>, 
    defaultType: SchemaType = 'string'
): ExtractorSchema {
    // Create selectors map
    const selectors: Record<string, string> = {};
    
    // Create structure map
    const structure: Record<string, StructuredSchema> = {};
    
    // Convert each field
    for (const [field, selector] of Object.entries(schema)) {
        selectors[field] = selector;
        
        // Create a basic structured schema for each field
        structure[field] = {
            type: defaultType,
            description: `Extracted from ${selector}`,
            nullable: true
        };
    }
    
    return {
        selectors,
        structure
    };
}