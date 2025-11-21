/**
 * Rate limiter utility for controlling request frequency
 */

interface RateLimiterConfig {
  maxRequests: number; // Maximum requests per time window
  windowMs: number; // Time window in milliseconds
  minDelay?: number; // Minimum delay between requests in milliseconds
}

interface RateLimiterState {
  requests: number[];
  lastRequestTime: number;
}

/**
 * Simple rate limiter implementation
 */
export class RateLimiter {
  private config: RateLimiterConfig;
  private state: RateLimiterState;
  private domain: string;
  private static instances: Map<string, RateLimiter> = new Map();

  constructor(domain: string, config?: Partial<RateLimiterConfig>) {
    this.domain = domain;
    this.config = {
      maxRequests: config?.maxRequests ?? 10,
      windowMs: config?.windowMs ?? 60000, // 1 minute default
      minDelay: config?.minDelay ?? 1000, // 1 second default
    };
    this.state = {
      requests: [],
      lastRequestTime: 0,
    };
  }

  /**
   * Get or create a rate limiter instance for a domain
   */
  static getInstance(domain: string, config?: Partial<RateLimiterConfig>): RateLimiter {
    if (!RateLimiter.instances.has(domain)) {
      RateLimiter.instances.set(domain, new RateLimiter(domain, config));
    }
    return RateLimiter.instances.get(domain)!;
  }

  /**
   * Check if we can make a request now
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests outside the time window
    this.state.requests = this.state.requests.filter(time => time > windowStart);

    // Check if we're under the limit
    if (this.state.requests.length >= this.config.maxRequests) {
      return false;
    }

    // Check minimum delay between requests
    if (this.config.minDelay && now - this.state.lastRequestTime < this.config.minDelay) {
      return false;
    }

    return true;
  }

  /**
   * Calculate how long to wait before next request
   */
  getWaitTime(): number {
    const now = Date.now();

    // Check minimum delay
    if (this.config.minDelay) {
      const timeSinceLastRequest = now - this.state.lastRequestTime;
      if (timeSinceLastRequest < this.config.minDelay) {
        return this.config.minDelay - timeSinceLastRequest;
      }
    }

    // Check rate limit window
    if (this.state.requests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...this.state.requests);
      const windowStart = now - this.config.windowMs;
      if (oldestRequest > windowStart) {
        return oldestRequest + this.config.windowMs - now;
      }
    }

    return 0;
  }

  /**
   * Wait until we can make a request
   */
  async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      const waitTime = this.getWaitTime();
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Record this request
    const now = Date.now();
    this.state.requests.push(now);
    this.state.lastRequestTime = now;
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    return fn();
  }

  /**
   * Get current statistics
   */
  getStats() {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const recentRequests = this.state.requests.filter(time => time > windowStart);

    return {
      domain: this.domain,
      requestsInWindow: recentRequests.length,
      maxRequests: this.config.maxRequests,
      windowMs: this.config.windowMs,
      timeSinceLastRequest: this.state.lastRequestTime ? now - this.state.lastRequestTime : null,
      canMakeRequest: this.canMakeRequest(),
      nextAvailableIn: this.getWaitTime(),
    };
  }

  /**
   * Reset the rate limiter state
   */
  reset(): void {
    this.state = {
      requests: [],
      lastRequestTime: 0,
    };
  }
}

/**
 * Default rate limiter with conservative settings
 */
export const defaultRateLimiter = new RateLimiter('default', {
  maxRequests: 10,
  windowMs: 60000, // 10 requests per minute
  minDelay: 2000, // 2 seconds between requests
});

/**
 * Get a rate limiter for a specific URL
 */
export function getRateLimiterForUrl(
  url: string,
  config?: Partial<RateLimiterConfig>
): RateLimiter {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    return RateLimiter.getInstance(domain, config);
  } catch {
    return defaultRateLimiter;
  }
}
