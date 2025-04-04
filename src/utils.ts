// filepath: c:\Users\trave\OneDrive\Desktop\Programs\Repository\Scapeai\webform-cli\src\utils.ts

export function log(message: string): void {
    console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
}

export function error(message: string): void {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
}

export function verboseLog(message: string, isVerbose: boolean): void {
    if (isVerbose) {
        console.log(`[VERBOSE] ${new Date().toISOString()}: ${message}`);
    }
}

/**
 * Get a configuration value from environment variables or return a default value
 * @param key The environment variable key
 * @param defaultValue The default value if not found
 * @returns The configuration value or default
 */
export function getEnv(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
}

/**
 * Get the Google AI API key from environment or config
 * @param configApiKey Optional API key from config
 * @returns The API key or empty string
 */
export function getGoogleApiKey(configApiKey?: string): string {
    return getEnv('GOOGLE_AI_API_KEY', configApiKey || '');
}

/**
 * Get the Google AI model name from environment or default
 * @param defaultModel Default model name
 * @returns The model name to use
 */
export function getGoogleModel(defaultModel: string = 'gemini-2.0-flash'): string {
    return getEnv('GOOGLE_AI_MODEL', defaultModel);
}