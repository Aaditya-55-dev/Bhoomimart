import axios, { AxiosRequestConfig } from 'axios';
import { robotsGatekeeper, BOT_USER_AGENT } from './robotsParser';
import { domainRateLimiter } from './rateLimiter';

export interface PoliteFetchResult {
  success: boolean;
  statusCode?: number;
  data: string | null;
  compliance: {
    robotsAllowed: boolean;
    crawlDelaySeconds: number;
    delayAppliedMs: number;
    verifiedAt: string;
    reason: string;
    targetUrl: string;
    host: string;
  };
}

/**
 * Transparent, polite HTTP fetcher that rigorously evaluates robots.txt, enforces single
 * concurrency per domain, respects crawl delays, and adheres to the Zero-Evasion Policy.
 */
export async function politeFetch(
  targetUrl: string,
  customConfig: AxiosRequestConfig = {}
): Promise<PoliteFetchResult> {
  const verifiedAt = new Date().toISOString();
  let host = 'unknown';

  try {
    const parsed = new URL(targetUrl);
    host = parsed.hostname;
  } catch {
    return {
      success: false,
      data: null,
      compliance: {
        robotsAllowed: false,
        crawlDelaySeconds: 0,
        delayAppliedMs: 0,
        verifiedAt,
        reason: 'Malformed URL provided',
        targetUrl,
        host
      }
    };
  }

  // 1. Check if domain is currently on cooldown / unindexable
  const blockStatus = domainRateLimiter.isDomainBlocked(host);
  if (blockStatus.blocked) {
    return {
      success: false,
      data: null,
      compliance: {
        robotsAllowed: false,
        crawlDelaySeconds: 0,
        delayAppliedMs: 0,
        verifiedAt,
        reason: blockStatus.reason || 'Domain on cooldown due to previous access restrictions',
        targetUrl,
        host
      }
    };
  }

  // 2. Evaluate target domain robots.txt
  const robotsCheck = await robotsGatekeeper.isAllowed(targetUrl);
  if (!robotsCheck.allowed) {
    return {
      success: false,
      data: null,
      compliance: {
        robotsAllowed: false,
        crawlDelaySeconds: robotsCheck.crawlDelay || 0,
        delayAppliedMs: 0,
        verifiedAt,
        reason: robotsCheck.reason,
        targetUrl,
        host
      }
    };
  }

  const crawlDelaySec = robotsCheck.crawlDelay || 2.5;
  const startWait = Date.now();
  let releaseLock: (() => void) | null = null;

  try {
    // 3. Acquire exclusive lock for domain & enforce crawl delay
    releaseLock = await domainRateLimiter.acquireLock(host, crawlDelaySec);
    const delayAppliedMs = Date.now() - startWait;

    // 4. Dispatch outbound HTTP request with transparent bot identity
    const response = await axios.get(targetUrl, {
      timeout: 6000,
      headers: {
        'User-Agent': BOT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
        ...(customConfig.headers || {})
      },
      validateStatus: (status) => status >= 200 && status < 500,
      ...customConfig
    });

    const htmlText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data || '');

    // 5. Zero-Evasion check on response
    const challengeCheck = domainRateLimiter.inspectResponseForChallenges(host, response.status, htmlText);
    if (challengeCheck.challengeDetected) {
      return {
        success: false,
        statusCode: response.status,
        data: null,
        compliance: {
          robotsAllowed: true,
          crawlDelaySeconds: crawlDelaySec,
          delayAppliedMs,
          verifiedAt,
          reason: challengeCheck.reason || 'Challenge or barrier encountered. Request aborted.',
          targetUrl,
          host
        }
      };
    }

    if (response.status >= 400) {
      return {
        success: false,
        statusCode: response.status,
        data: null,
        compliance: {
          robotsAllowed: true,
          crawlDelaySeconds: crawlDelaySec,
          delayAppliedMs,
          verifiedAt,
          reason: `HTTP ${response.status} response from destination`,
          targetUrl,
          host
        }
      };
    }

    return {
      success: true,
      statusCode: response.status,
      data: htmlText,
      compliance: {
        robotsAllowed: true,
        crawlDelaySeconds: crawlDelaySec,
        delayAppliedMs,
        verifiedAt,
        reason: 'Authorized and ingested in full accordance with robots.txt policy',
        targetUrl,
        host
      }
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      compliance: {
        robotsAllowed: true,
        crawlDelaySeconds: crawlDelaySec,
        delayAppliedMs: Date.now() - startWait,
        verifiedAt,
        reason: error?.message || 'Outbound connection error',
        targetUrl,
        host
      }
    };
  } finally {
    if (releaseLock) {
      releaseLock();
    }
  }
}
