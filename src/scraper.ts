import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractStructuredData } from './extractor';
// Import the necessary types from the types module
import type { ExtractorSchema, StructuredOutput, SchemaType, StructuredSchema } from './types';

export async function fetchHTML(url: string, options?: { retry?: number; verbose?: boolean }): Promise<string> {
    const retries = options?.retry || 0;
    const verbose = options?.verbose || false;
    
    if (verbose) {
        console.log(`Fetching HTML from ${url} with ${retries} retries`);
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (verbose && attempt > 0) {
                console.log(`Retry attempt ${attempt} of ${retries}`);
            }
            const response = await axios.get(url);
            return response.data;
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (verbose) {
                console.error(`Fetch attempt ${attempt + 1} failed: ${lastError.message}`);
            }
            // Only wait and retry if we have retries left
            if (attempt < retries) {
                // Exponential backoff: 1s, 2s, 4s, 8s...
                const waitTime = Math.pow(2, attempt) * 1000;
                if (verbose) {
                    console.log(`Waiting ${waitTime}ms before retrying...`);
                }
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    // If we get here, all retries failed
    throw new Error(`Failed to fetch HTML from ${url} after ${retries + 1} attempts: ${lastError?.message}`);
}

export function parseHTML(html: string): cheerio.Root {
    return cheerio.load(html);
}

export function extractData(html: string, schema: Record<string, string>): Record<string, string | string[]> {
    const $ = cheerio.load(html);
    const result: Record<string, string | string[]> = {};
    
    // Extract data based on schema selectors
    for (const [key, selector] of Object.entries(schema)) {
        try {
            const elements = $(selector);
            
            // If multiple elements match the selector, return an array of values
            if (elements.length > 1) {
                result[key] = elements.map((i, el) => $(el).text().trim()).get();
            } else {
                // Get text from the selected element and clean it
                const value = elements.text().trim();
                result[key] = value;
            }
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