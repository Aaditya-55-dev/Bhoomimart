export interface BlockStatus {
  blocked: boolean;
  reason?: string;
  resumesAt?: number;
}

interface DomainQueueState {
  activeRequests: number;
  lastCompletedTimestamp: number;
  blockedUntil: number;
  blockReason?: string;
  waiters: Array<() => void>;
}

export class DomainRateLimiter {
  private domains: Map<string, DomainQueueState> = new Map();
  private readonly DEFAULT_DELAY_MS = 2500; // 2.5 second polite default

  private getDomainState(host: string): DomainQueueState {
    const cleanHost = host.toLowerCase().trim();
    let state = this.domains.get(cleanHost);
    if (!state) {
      state = {
        activeRequests: 0,
        lastCompletedTimestamp: 0,
        blockedUntil: 0,
        waiters: []
      };
      this.domains.set(cleanHost, state);
    }
    return state;
  }

  /**
   * Evaluates whether a domain is currently on cooldown or marked unindexable
   */
  public isDomainBlocked(host: string): BlockStatus {
    const state = this.getDomainState(host);
    const now = Date.now();
    if (state.blockedUntil > now) {
      return {
        blocked: true,
        reason: state.blockReason || 'Domain temporarily unindexable under zero-evasion compliance policy',
        resumesAt: state.blockedUntil
      };
    }
    return { blocked: false };
  }

  /**
   * Marks a domain unindexable (Zero Evasion Policy)
   */
  public blockDomain(host: string, durationMs: number, reason: string): void {
    const state = this.getDomainState(host);
    state.blockedUntil = Date.now() + durationMs;
    state.blockReason = reason;

    // Purge any pending waiters on blocked domain
    state.waiters.forEach(waiter => waiter());
    state.waiters = [];
  }

  /**
   * Acquires a serialized execution slot for a domain, enforcing single-concurrency
   * and polite crawl delay. Returns an async release function.
   */
  public async acquireLock(host: string, robotsCrawlDelaySeconds?: number): Promise<() => void> {
    const state = this.getDomainState(host);

    const blockCheck = this.isDomainBlocked(host);
    if (blockCheck.blocked) {
      throw new Error(`Domain ${host} is excluded: ${blockCheck.reason}`);
    }

    const delayMs = Math.max(
      this.DEFAULT_DELAY_MS,
      (robotsCrawlDelaySeconds || 0) * 1000
    );

    // Wait if another request is active on this host
    if (state.activeRequests > 0) {
      await new Promise<void>((resolve) => {
        state.waiters.push(resolve);
      });
    }

    const now = Date.now();
    const elapsed = now - state.lastCompletedTimestamp;
    if (elapsed < delayMs) {
      await new Promise((r) => setTimeout(r, delayMs - elapsed));
    }

    state.activeRequests = 1;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      state.activeRequests = 0;
      state.lastCompletedTimestamp = Date.now();

      // Dispatch next waiting caller if available
      if (state.waiters.length > 0) {
        const next = state.waiters.shift();
        if (next) next();
      }
    };
  }

  /**
   * Inspects HTTP response codes and HTML payload for anti-bot barriers or challenge walls.
   * If detected, flags the domain under the Zero-Evasion policy without circumvention.
   */
  public inspectResponseForChallenges(
    host: string,
    statusCode: number,
    htmlText: string = ''
  ): { challengeDetected: boolean; reason?: string } {
    if (statusCode === 401) {
      const reason = 'HTTP 401 Unauthorized - Authentication barrier detected';
      this.blockDomain(host, 2 * 60 * 60 * 1000, reason);
      return { challengeDetected: true, reason };
    }

    if (statusCode === 403) {
      const reason = 'HTTP 403 Forbidden - Access denied by target host';
      this.blockDomain(host, 3 * 60 * 60 * 1000, reason);
      return { challengeDetected: true, reason };
    }

    if (statusCode === 429) {
      const reason = 'HTTP 429 Too Many Requests - Target rate limit triggered';
      this.blockDomain(host, 60 * 60 * 1000, reason);
      return { challengeDetected: true, reason };
    }

    // Inspect content signatures for bot-detection challenges
    const lower = htmlText.slice(0, 5000).toLowerCase();
    const challengeSignatures = [
      'cf-browser-verification',
      'challenge-platform',
      'cf_chl_opt',
      'cloudflare-challenge',
      'just a moment...',
      'attention required! | cloudflare',
      'datadome',
      'g-recaptcha',
      'hcaptcha',
      'perimeterx',
      'shieldsquare',
      'security check to access',
      'bot detection'
    ];

    for (const sig of challengeSignatures) {
      if (lower.includes(sig)) {
        const reason = `Automated challenge detected (${sig}) - Zero evasion rule applied`;
        this.blockDomain(host, 4 * 60 * 60 * 1000, reason);
        return { challengeDetected: true, reason };
      }
    }

    return { challengeDetected: false };
  }
}

export const domainRateLimiter = new DomainRateLimiter();
