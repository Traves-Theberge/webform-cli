import { promises as fs } from 'node:fs';

export async function outputFormattedData(data: string, format: 'json' | 'text', savePath?: string): Promise<void> {
    try {
        // Check if data is valid JSON before trying to parse it
        let formattedData;
        if (format === 'json') {
            try {
                // Try to parse as JSON
                const parsedData = JSON.parse(data);
                formattedData = JSON.stringify(parsedData, null, 2);
            } catch (error) {
                // If not valid JSON, keep as text but warn
                console.warn('Warning: Response is not valid JSON, outputting as text instead.');
                formattedData = data;
            }
        } else {
            formattedData = data;
        }
        
        if (savePath) {
            await fs.writeFile(savePath, formattedData);
            console.log(`Output saved to ${savePath}`);
        } else {
            console.log(formattedData);
        }
    } catch (error) {
        console.error('Error formatting output:', error);
        // Fallback to outputting raw data
        console.log(data);
    }
}

/**
 * Output structured data according to specified format
 */
export async function outputStructuredData(
    data: StructuredOutput, 
    format: 'json' | 'text' = 'json',
    savePath?: string,
    options: OutputOptions = {}
): Promise<void> {
    const { includeMetadata = true, indentation = 2 } = options;
    
    // If metadata should be excluded, create a copy without it
    const outputData = includeMetadata ? data : excludeMetadata(data);
    
    // Format the data according to the requested format
    const formattedData = format === 'json' 
        ? JSON.stringify(outputData, null, indentation)
        : formatAsText(outputData);
    
    if (savePath) {
        await fs.writeFile(savePath, formattedData);
        console.log(`Output saved to ${savePath}`);
    } else {
        console.log(formattedData);
    }
}

/**
 * Remove metadata from the structured output
 */
function excludeMetadata(data: StructuredOutput): any {
    const { _metadata, ...rest } = data;
    return rest;
}

/**
 * Format structured data as readable text
 */
function formatAsText(data: any, indent = 0): string {
    if (data === null || data === undefined) {
        return 'null';
    }
    
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return String(data);
    }
    
    if (Array.isArray(data)) {
        if (data.length === 0) return '[]';
        
        return data.map(item => {
            const itemText = formatAsText(item, indent + 2);
            return `${' '.repeat(indent)}- ${itemText.trim()}`;
        }).join('\n');
    }
    
    if (typeof data === 'object') {
        if (Object.keys(data).length === 0) return '{}';
        
        return Object.entries(data).map(([key, value]) => {
            const valueText = formatAsText(value, indent + 2);
            if (key === '_metadata' && indent === 0) {
                return `\n// Metadata:\n${' '.repeat(indent)}${key}: ${valueText}`;
            }
            return `${' '.repeat(indent)}${key}: ${valueText}`;
        }).join('\n');
    }
    
    return String(data);
}

/**
 * Options for structured data output
 */
interface OutputOptions {
    includeMetadata?: boolean;
    indentation?: number;
}