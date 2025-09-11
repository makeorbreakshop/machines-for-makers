/**
 * Simple in-memory rate limiter for API endpoints
 * In production, consider using Redis or similar for distributed rate limiting
 */

interface RateLimitEntry {
  attempts: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @returns true if request should be blocked, false if allowed
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry) {
      // First request from this identifier
      this.limits.set(identifier, {
        attempts: 1,
        resetTime: now + this.windowMs
      });
      return false;
    }

    if (now > entry.resetTime) {
      // Window has expired, reset counter
      this.limits.set(identifier, {
        attempts: 1,
        resetTime: now + this.windowMs
      });
      return false;
    }

    // Within the window
    entry.attempts++;
    
    if (entry.attempts > this.maxAttempts) {
      return true; // Rate limited
    }

    return false;
  }

  /**
   * Get remaining attempts for an identifier
   */
  getRemainingAttempts(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) return this.maxAttempts;
    
    const now = Date.now();
    if (now > entry.resetTime) return this.maxAttempts;
    
    return Math.max(0, this.maxAttempts - entry.attempts);
  }

  /**
   * Get time until rate limit resets (in seconds)
   */
  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) return 0;
    
    const now = Date.now();
    if (now > entry.resetTime) return 0;
    
    return Math.ceil((entry.resetTime - now) / 1000);
  }

  /**
   * Clean up expired entries to prevent memory leak
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime + this.windowMs) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a specific identifier (e.g., after successful login)
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }
}

// Export singleton instances for different use cases
export const loginRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
export const uploadRateLimiter = new RateLimiter(10, 300000); // 10 uploads per 5 minutes

export default RateLimiter;