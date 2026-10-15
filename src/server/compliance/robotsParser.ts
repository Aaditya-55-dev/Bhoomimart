import axios from 'axios';
import robotsParser from 'robots-parser';

export const BOT_NAME = 'BhoomimartBot';
export const BOT_USER_AGENT = 'BhoomimartBot/1.0 (+https://bhoomimart.in/compliance; bot@bhoomimart.in)';

export interface RobotsCheckResult {
  allowed: boolean;
  reason: string;
  crawlDelay?: number;
  robotsUrl?: string;
}

interface CachedRobots {
  parser: any;
  fetchedAt: number;
}

export class RobotsGatekeeper {
  private cache: Map<string, CachedRobots> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Cleans and validates a URL string
   */
  public extractOrigin(urlString: string): string | null {
    try {
      const parsed = new URL(urlString);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return null;
    }
  }

  /**
   * Fetches and parses robots.txt for a given domain with in-memory TTL caching
   */
  public async getParser(targetUrl: string): Promise<{ parser: any; robotsUrl: string } | null> {
    const origin = this.extractOrigin(targetUrl);
    if (!origin) return null;

    const robotsUrl = `${origin}/robots.txt`;
    const cached = this.cache.get(origin);
    const now = Date.now();

    if (cached && (now - cached.fetchedAt) < this.CACHE_TTL_MS) {
      return { parser: cached.parser, robotsUrl };
    }

    try {
      const response = await axios.get(robotsUrl, {
        timeout: 4500,
        headers: {
          'User-Agent': BOT_USER_AGENT,
          'Accept': 'text/plain,text/html,*/*'
        },
        validateStatus: (status) => (status >= 200 && status < 400) || status === 404 || status === 403 || status === 401
      });

      if (response.status === 404) {
        // Under RFC 9309, missing robots.txt (404) grants unconstrained crawling permission
        const parser = robotsParser(robotsUrl, 'User-agent: *\nAllow: /');
        this.cache.set(origin, { parser, fetchedAt: now });
        return { parser, robotsUrl };
      }

      if (response.status === 401 || response.status === 403) {
        // Forbidden robots.txt indicates crawler exclusion
        const parser = robotsParser(robotsUrl, 'User-agent: *\nDisallow: /');
        this.cache.set(origin, { parser, fetchedAt: now });
        return { parser, robotsUrl };
      }

      const robotsText = typeof response.data === 'string' ? response.data : String(response.data || '');
      const parser = robotsParser(robotsUrl, robotsText);
      this.cache.set(origin, { parser, fetchedAt: now });
      return { parser, robotsUrl };
    } catch {
      // Network failure, timeout, or refusal: ethical default is strict disallow
      const fallbackParser = robotsParser(robotsUrl, 'User-agent: *\nDisallow: /');
      this.cache.set(origin, { parser: fallbackParser, fetchedAt: now });
      return { parser: fallbackParser, robotsUrl };
    }
  }

  /**
   * Verifies if a given URL is permitted for ingestion under robots.txt
   */
  public async isAllowed(targetUrl: string): Promise<RobotsCheckResult> {
    const parsedOrigin = this.extractOrigin(targetUrl);
    if (!parsedOrigin) {
      return { allowed: false, reason: 'Invalid or unparseable target URL' };
    }

    const result = await this.getParser(targetUrl);
    if (!result) {
      return { allowed: false, reason: 'Unable to evaluate target domain robots.txt' };
    }

    const { parser, robotsUrl } = result;

    // Check specific bot token first, then fallback to wildcard '*'
    const allowedForBot = parser.isAllowed(targetUrl, BOT_NAME);
    const allowedForWildcard = parser.isAllowed(targetUrl, '*');

    // Both explicit disallow and wildcard disallow are respected
    if (allowedForBot === false || allowedForWildcard === false) {
      return {
        allowed: false,
        reason: 'Disallowed by target robots.txt directive',
        robotsUrl
      };
    }

    const delay = parser.getCrawlDelay(BOT_NAME) || parser.getCrawlDelay('*');

    return {
      allowed: true,
      reason: 'Permitted by target robots.txt',
      crawlDelay: typeof delay === 'number' && Number.isFinite(delay) && delay > 0 ? delay : undefined,
      robotsUrl
    };
  }
}

export const robotsGatekeeper = new RobotsGatekeeper();
