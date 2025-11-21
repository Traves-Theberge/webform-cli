/**
 * Interactive setup utility for WebForm CLI
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { validateApiKey } from './validation';

/**
 * Available Gemini AI models
 */
export const AVAILABLE_MODELS = [
  { name: 'gemini-2.0-flash (Fast, recommended)', value: 'gemini-2.0-flash' },
  { name: 'gemini-1.5-pro (Most capable)', value: 'gemini-1.5-pro' },
  { name: 'gemini-1.5-flash (Balanced)', value: 'gemini-1.5-flash' },
];

/**
 * Create or update .env file with API key
 * @param apiKey The API key to store
 * @param model Optional model name to store
 */
export async function setupEnvFile(apiKey: string, model?: string): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  // Read existing .env if it exists
  try {
    envContent = await fs.readFile(envPath, 'utf-8');
  } catch (error) {
    // File doesn't exist, will create new one
    envContent = '';
  }

  // Parse existing env content
  const envLines = envContent.split('\n');
  const envVars: Record<string, string> = {};

  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  }

  // Update API key
  envVars['GOOGLE_AI_API_KEY'] = apiKey;

  // Update model if provided
  if (model) {
    envVars['GOOGLE_AI_MODEL'] = model;
  }

  // Rebuild .env file content
  const newEnvContent =
    Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';

  // Write .env file
  await fs.writeFile(envPath, newEnvContent, { mode: 0o600 }); // Secure permissions

  // Check if .gitignore exists and add .env if not present
  await ensureGitignore();
}

/**
 * Ensure .env is in .gitignore
 */
async function ensureGitignore(): Promise<void> {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let gitignoreContent = '';

  try {
    gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
  } catch (error) {
    // .gitignore doesn't exist, will create it
    gitignoreContent = '';
  }

  // Check if .env is already in .gitignore
  if (!gitignoreContent.includes('.env')) {
    gitignoreContent += '\n# Environment variables\n.env\n.env.local\n';
    await fs.writeFile(gitignorePath, gitignoreContent);
  }
}

/**
 * Get current API key from environment
 */
export function getCurrentApiKey(): string | undefined {
  return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
}

/**
 * Get current model from environment
 */
export function getCurrentModel(): string {
  return process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash';
}

/**
 * Prompt user for API key (simplified for non-interactive environments)
 * In a real interactive CLI, you'd use a library like 'inquirer' or 'prompts'
 */
export function promptForApiKey(): string {
  // In a real implementation, this would be interactive
  // For now, we'll provide instructions
  throw new Error('Interactive prompting not available. Please provide API key as argument.');
}

/**
 * Test API key by making a simple request
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    validateApiKey(apiKey);
    // In a real implementation, you'd make a test API call
    // For now, we just validate the format
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Display setup instructions
 */
export function getSetupInstructions(): string {
  return `
WebForm CLI Setup Instructions:

1. Get your API key from Google AI Studio:
   https://makersuite.google.com/app/apikey

2. Set up your API key (choose one method):

   Method A - Environment Variable (Recommended):
   $ export GOOGLE_AI_API_KEY=your_key_here

   Method B - .env File (Recommended for projects):
   $ echo "GOOGLE_AI_API_KEY=your_key_here" > .env

   Method C - Using this CLI:
   $ webform setup --api-key YOUR_API_KEY

3. (Optional) Select a model:
   $ webform setup --model gemini-2.0-flash

Available Models:
  - gemini-2.0-flash (Fast, recommended for most use cases)
  - gemini-1.5-pro (Most capable, best for complex tasks)
  - gemini-1.5-flash (Balanced speed and capability)

4. Test your setup:
   $ webform setup --test
`;
}
