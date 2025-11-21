/**
 * Validation utilities for URLs, CSS selectors, and other inputs
 */

/**
 * Validate and sanitize a URL
 * @param urlString The URL string to validate
 * @returns Validated URL object
 * @throws Error if URL is invalid or uses an unsupported protocol
 */
export function validateUrl(urlString: string): URL {
  try {
    const url = new URL(urlString);

    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Unsupported protocol: ${url.protocol}. Only HTTP and HTTPS are allowed.`);
    }

    // Prevent localhost and private IPs (basic check)
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      console.warn('Warning: Attempting to scrape local/private IP address. Proceed with caution.');
    }

    return url;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid URL: ${urlString}`);
    }
    throw error;
  }
}

/**
 * Validate a CSS selector for basic safety
 * @param selector The CSS selector to validate
 * @returns True if selector appears safe
 * @throws Error if selector contains potentially dangerous patterns
 */
export function validateCssSelector(selector: string): boolean {
  if (!selector || typeof selector !== 'string') {
    throw new Error('CSS selector must be a non-empty string');
  }

  // Check for excessively long selectors (potential DoS)
  if (selector.length > 500) {
    throw new Error('CSS selector is too long (max 500 characters)');
  }

  // Check for suspicious patterns that might cause issues
  const dangerousPatterns = [
    /javascript:/i,  // JavaScript injection
    /data:/i,        // Data URIs
    /vbscript:/i,    // VBScript
    /<script/i,      // Script tags
    /on\w+=/i,       // Event handlers
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(selector)) {
      throw new Error(`CSS selector contains potentially dangerous pattern: ${pattern.source}`);
    }
  }

  // Basic syntax validation - check for balanced brackets
  const openBrackets = (selector.match(/\[/g) || []).length;
  const closeBrackets = (selector.match(/\]/g) || []).length;
  const openParens = (selector.match(/\(/g) || []).length;
  const closeParens = (selector.match(/\)/g) || []).length;

  if (openBrackets !== closeBrackets) {
    throw new Error('CSS selector has unbalanced square brackets');
  }

  if (openParens !== closeParens) {
    throw new Error('CSS selector has unbalanced parentheses');
  }

  return true;
}

/**
 * Validate all selectors in a schema
 * @param selectors Object mapping field names to CSS selectors
 * @returns True if all selectors are valid
 * @throws Error if any selector is invalid
 */
export function validateSchemaSelectors(selectors: Record<string, string>): boolean {
  for (const [field, selector] of Object.entries(selectors)) {
    try {
      validateCssSelector(selector);
    } catch (error) {
      throw new Error(`Invalid selector for field '${field}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return true;
}

/**
 * Validate an API key format
 * @param apiKey The API key to validate
 * @returns True if API key appears valid
 * @throws Error if API key is invalid
 */
export function validateApiKey(apiKey: string | undefined): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key must be a non-empty string');
  }

  if (apiKey.trim().length < 10) {
    throw new Error('API key appears to be too short (minimum 10 characters)');
  }

  // Check for placeholder values
  const placeholderPatterns = [
    /^YOUR_API_KEY$/i,
    /^REPLACE_ME$/i,
    /^API_KEY$/i,
    /^KEY$/i,
    /^XXX/i,
    /^111/i,
    /^abc/i,
    /^test/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(apiKey)) {
      throw new Error('API key appears to be a placeholder value. Please set a real API key.');
    }
  }

  return true;
}

/**
 * Sanitize a file path to prevent path traversal attacks
 * @param filePath The file path to sanitize
 * @param baseDir Optional base directory to restrict paths to
 * @returns Sanitized file path
 * @throws Error if path contains dangerous patterns
 */
export function validateFilePath(filePath: string, baseDir?: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('File path must be a non-empty string');
  }

  // Check for path traversal attempts
  if (filePath.includes('..')) {
    throw new Error('File path cannot contain ".." (path traversal attempt)');
  }

  // Check for absolute paths that might escape intended directory
  if (baseDir && filePath.startsWith('/') && !filePath.startsWith(baseDir)) {
    throw new Error('Absolute file paths must be within the base directory');
  }

  // Check for suspicious characters
  if (/[\0\x08\x0B\x0C\x0E-\x1F]/.test(filePath)) {
    throw new Error('File path contains invalid control characters');
  }

  return filePath;
}
