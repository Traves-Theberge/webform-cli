import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getConfig } from './configManager';
import { getGoogleApiKey, getGoogleModel } from './utils';
import 'dotenv/config'; // Load environment variables

// Create a custom Google AI provider instance
const createAIProvider = async () => {
    // First try to get the API key from environment variables, then fallback to config file
    const configApiKey = await getConfig('gemini_api_key');
    const apiKey = getGoogleApiKey(configApiKey);
    
    if (!apiKey) {
        throw new Error('Google AI API key not found. Please set it in the .env file or using "webform config set gemini_api_key YOUR_API_KEY"');
    }
    
    return createGoogleGenerativeAI({
        apiKey: apiKey,
        // Additional custom settings can be added here
    });
};

export async function formatWithGemini(extractedData: Record<string, any>, schema: Record<string, string> | null): Promise<string> {
    try {
        const googleAI = await createAIProvider();
        const modelName = getGoogleModel();
        const model = googleAI(modelName);
        
        // Check if schema is undefined or null and handle it properly
        const schemaStr = schema ? JSON.stringify(schema) : "No schema provided";
        const dataStr = JSON.stringify(extractedData);
        
        const prompt = `Format the following data according to the schema: ${schemaStr}. Data: ${dataStr}`;
        
        const result = await generateText({
            model: model,
            prompt: prompt
        });
        
        return result.text;
    } catch (error) {
        console.error('Error communicating with Google AI API for formatting:', error);
        throw new Error('Failed to format data with Google AI API.');
    }
}

export async function processWithGemini(extractedData: Record<string, any>): Promise<string> {
    try {
        const googleAI = await createAIProvider();
        const modelName = getGoogleModel();
        const model = googleAI(modelName);
        
        // Handle case where extractedData may be complex
        const dataStr = JSON.stringify(extractedData, null, 2);
        
        const prompt = `Process and analyze the following data extracted from a web page. Provide a coherent summary and highlight key information:

${dataStr}`;
        
        const result = await generateText({
            model: model,
            prompt: prompt
        });
        
        return result.text;
    } catch (error) {
        console.error('Error communicating with Google AI API for processing:', error);
        throw new Error('Failed to process data with Google AI API.');
    }
}

/**
 * Format extracted data as structured output according to schema
 */
export async function formatStructuredOutput(
    extractedData: Record<string, any>,
    schema: Record<string, StructuredSchema>
): Promise<StructuredOutput> {
    try {
        const googleAI = await createAIProvider();
        const modelName = getGoogleModel();
        const model = googleAI(modelName);
        
        // Create a detailed prompt explaining the structured output format
        const prompt = `
I need to convert this extracted web data into a structured format that strictly conforms to the provided schema.

EXTRACTED DATA:
${JSON.stringify(extractedData, null, 2)}

TARGET SCHEMA:
${JSON.stringify(schema, null, 2)}

Requirements:
1. Ensure all values are of the correct type specified in the schema
2. Format values according to any format specifications
3. Ensure arrays have the right structure and don't exceed maxItems
4. For objects, include all required properties
5. Ensure the output is valid JSON that strictly follows the schema structure
6. Don't include properties that aren't in the schema

Return ONLY the formatted JSON response without explanations.`;

        const result = await generateText({
            model: model,
            prompt: prompt
        });
        
        try {
            // Clean up any potential markdown code blocks or extra text
            let cleanedText = result.text.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.substring(7);
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.substring(3);
            }
            
            if (cleanedText.endsWith('```')) {
                cleanedText = cleanedText.substring(0, cleanedText.length - 3);
            }
            
            cleanedText = cleanedText.trim();
            
            const formattedData = JSON.parse(cleanedText);
            return addMetadata(formattedData);
        } catch (parseError) {
            console.error('Error parsing LLM response as JSON:', parseError);
            // If JSON parsing fails, return the extracted data with minimal validation
            return addMetadata(validateBasicTypes(extractedData, schema));
        }
    } catch (error) {
        console.error('Error generating structured output:', error);
        // Fallback to basic validation if AI processing fails
        return addMetadata(validateBasicTypes(extractedData, schema));
    }
}

/**
 * Add metadata to structured output
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
 * Basic validation for when AI processing fails
 */
function validateBasicTypes(
    data: Record<string, any>, 
    schema: Record<string, StructuredSchema>
): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [field, fieldSchema] of Object.entries(schema)) {
        if (data[field] === undefined) {
            continue;
        }
        
        switch (fieldSchema.type) {
            case 'string':
                result[field] = String(data[field]);
                break;
            case 'number':
                const num = Number(data[field]);
                result[field] = isNaN(num) ? 0 : num;
                break;
            case 'boolean':
                result[field] = Boolean(data[field]);
                break;
            case 'array':
                result[field] = Array.isArray(data[field]) ? data[field] : [data[field]];
                break;
            default:
                result[field] = data[field];
        }
    }
    
    return result;
}