/**
 * Robots.txt checker for ethical web scraping
 */

import axios from 'axios';

interface RobotsRule {
  userAgent: string;
  disallowedPaths: string[];
  allowedPaths: string[];
  crawlDelay?: number;
}

interface RobotsCache {
  [domain: string]: {
    rules: RobotsRule[];
    fetchedAt: number;
    rawContent: string;
  };
}

/**
 * Parse robots.txt content
 */
function parseRobotsTxt(content: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let currentRule: RobotsRule | null = null;

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const [key, ...valueParts] = trimmedLine.split(':');
    const value = valueParts.join(':').trim();

    if (!key || !value) {
      continue;
    }

    const normalizedKey = key.toLowerCase().trim();

    switch (normalizedKey) {
      case 'user-agent':
        // Start a new rule
        if (currentRule) {
          rules.push(currentRule);
        }
        currentRule = {
          userAgent: value.toLowerCase(),
          disallowedPaths: [],
          allowedPaths: [],
        };
        break;

      case 'disallow':
        if (currentRule) {
          currentRule.disallowedPaths.push(value);
        }
        break;

      case 'allow':
        if (currentRule) {
          currentRule.allowedPaths.push(value);
        }
        break;

      case 'crawl-delay':
        if (currentRule) {
          const delay = parseFloat(value);
          if (!isNaN(delay)) {
            currentRule.crawlDelay = delay * 1000; // Convert to milliseconds
          }
        }
        break;
    }
  }

  // Add the last rule
  if (currentRule) {
    rules.push(currentRule);
  }

  return rules;
}

/**
 * Check if a path matches a robots.txt pattern
 */
function matchesPattern(path: string, pattern: string): boolean {
  // Handle wildcard patterns
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*'); // Replace * with .*
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(path);
  }

  // Exact prefix match
  return path.startsWith(pattern);
}

/**
 * In-memory cache for robots.txt files
 */
const robotsCache: RobotsCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch and parse robots.txt for a domain
 */
export async function fetchRobotsTxt(domain: string): Promise<RobotsRule[]> {
  // Check cache first
  const cached = robotsCache[domain];
  if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
    return cached.rules;
  }

  try {
    const robotsUrl = `https://${domain}/robots.txt`;
    const response = await axios.get(robotsUrl, {
      timeout: 5000,
      validateStatus: status => status === 200 || status === 404,
    });

    if (response.status === 404) {
      // No robots.txt found - allow everything
      const defaultRules: RobotsRule[] = [
        {
          userAgent: '*',
          disallowedPaths: [],
          allowedPaths: ['/'],
        },
      ];
      robotsCache[domain] = {
        rules: defaultRules,
        fetchedAt: Date.now(),
        rawContent: '',
      };
      return defaultRules;
    }

    const rules = parseRobotsTxt(response.data);
    robotsCache[domain] = {
      rules,
      fetchedAt: Date.now(),
      rawContent: response.data,
    };
    return rules;
  } catch (error) {
    // On error, be conservative and assume restricted
    console.warn(`Could not fetch robots.txt for ${domain}, proceeding with caution`);
    return [
      {
        userAgent: '*',
        disallowedPaths: [],
        allowedPaths: ['/'],
      },
    ];
  }
}

/**
 * Check if a URL is allowed by robots.txt
 */
export async function isAllowedByRobots(url: string, userAgent: string = 'WebForm-CLI'): Promise<{
  allowed: boolean;
  reason?: string;
  crawlDelay?: number;
}> {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;

    const rules = await fetchRobotsTxt(domain);

    // Find applicable rules (check user-agent specific first, then *)
    const applicableRules = rules.filter(
      rule => rule.userAgent === userAgent.toLowerCase() || rule.userAgent === '*'
    );

    if (applicableRules.length === 0) {
      return { allowed: true };
    }

    // Check rules in order
    for (const rule of applicableRules) {
      // Check allowed paths first (more specific)
      for (const allowedPath of rule.allowedPaths) {
        if (matchesPattern(path, allowedPath)) {
          return {
            allowed: true,
            crawlDelay: rule.crawlDelay,
          };
        }
      }

      // Then check disallowed paths
      for (const disallowedPath of rule.disallowedPaths) {
        if (matchesPattern(path, disallowedPath)) {
          return {
            allowed: false,
            reason: `Path ${path} is disallowed by robots.txt (pattern: ${disallowedPath})`,
            crawlDelay: rule.crawlDelay,
          };
        }
      }
    }

    // If no rules matched, allow by default
    return {
      allowed: true,
      crawlDelay: applicableRules[0]?.crawlDelay,
    };
  } catch (error) {
    // On error, allow but warn
    console.warn(`Error checking robots.txt: ${error}`);
    return { allowed: true };
  }
}

/**
 * Get crawl delay recommendation for a domain
 */
export async function getRecommendedCrawlDelay(url: string): Promise<number | null> {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const rules = await fetchRobotsTxt(domain);

    for (const rule of rules) {
      if (rule.crawlDelay !== undefined) {
        return rule.crawlDelay;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get raw robots.txt content for a domain
 */
export function getRawRobotsTxt(domain: string): string | null {
  const cached = robotsCache[domain];
  return cached ? cached.rawContent : null;
}
