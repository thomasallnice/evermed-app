/**
 * MCP Test Runner - Reference Implementation
 *
 * This file demonstrates how to integrate Chrome DevTools MCP tools
 * with Vitest E2E tests. It provides helper functions that wrap
 * MCP tool calls for use in test suites.
 *
 * NOTE: This is a reference implementation. Actual MCP tool execution
 * requires the Claude Code environment with MCP server configured.
 */

import { expect } from 'vitest';

// MCP Tool Response Types
export interface NavigateResult {
  success: boolean;
  url: string;
  error?: string;
}

export interface ScreenshotResult {
  success: boolean;
  path: string;
  error?: string;
}

export interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  text: string;
  timestamp: number;
  source?: string;
  stackTrace?: string;
}

export interface ConsoleMessagesResult {
  messages: ConsoleMessage[];
  errorCount: number;
  warnCount: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  type: string;
  size: number;
  time: number;
}

export interface NetworkRequestsResult {
  requests: NetworkRequest[];
  failedRequests: NetworkRequest[];
}

export interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalLoadTime: number;
  domContentLoaded: number;
}

export interface PerformanceTraceResult {
  metrics: PerformanceMetrics;
  insights: string[];
}

export interface EvaluateScriptResult {
  result: any;
  error?: string;
}

/**
 * MCP Test Helpers
 *
 * These functions provide a clean API for E2E tests to interact with
 * Chrome DevTools MCP tools. They handle error checking and provide
 * useful assertions.
 */
export class MCPTestHelpers {
  /**
   * Navigate to a URL and wait for page load
   */
  static async navigateTo(url: string): Promise<NavigateResult> {
    // In actual implementation, this would call:
    // mcp__chrome_devtools__navigate_page({ url })
    console.log(`[MCP] Navigate to: ${url}`);

    // Mock response for reference
    return {
      success: true,
      url
    };
  }

  /**
   * Take a screenshot and save to specified path
   */
  static async takeScreenshot(path: string): Promise<ScreenshotResult> {
    // In actual implementation, this would call:
    // mcp__chrome_devtools__take_screenshot({ path })
    console.log(`[MCP] Take screenshot: ${path}`);

    return {
      success: true,
      path
    };
  }

  /**
   * Get all console messages and check for errors
   */
  static async getConsoleMessages(): Promise<ConsoleMessagesResult> {
    // In actual implementation, this would call:
    // mcp__chrome_devtools__list_console_messages()
    console.log(`[MCP] Get console messages`);

    // Mock response for reference
    return {
      messages: [],
      errorCount: 0,
      warnCount: 0
    };
  }

  /**
   * Assert zero console errors (fail test if errors found)
   */
  static async assertZeroConsoleErrors(): Promise<void> {
    const result = await this.getConsoleMessages();

    if (result.errorCount > 0) {
      const errors = result.messages
        .filter(m => m.type === 'error')
        .map(m => `  - ${m.text}`)
        .join('\n');

      throw new Error(
        `Console errors detected (${result.errorCount}):\n${errors}\n\n` +
        `⛔ BLOCKING PR: Console errors are not allowed in production code.`
      );
    }

    expect(result.errorCount).toBe(0);
  }

  /**
   * Get all network requests
   */
  static async getNetworkRequests(): Promise<NetworkRequestsResult> {
    // In actual implementation, this would call:
    // mcp__chrome_devtools__list_network_requests()
    console.log(`[MCP] Get network requests`);

    return {
      requests: [],
      failedRequests: []
    };
  }

  /**
   * Assert no critical network failures (4xx/5xx on important resources)
   */
  static async assertNoCriticalNetworkFailures(): Promise<void> {
    const result = await this.getNetworkRequests();

    const criticalFailures = result.failedRequests.filter(req =>
      req.status >= 400 && !this.isNonCriticalRequest(req.url)
    );

    if (criticalFailures.length > 0) {
      const failures = criticalFailures
        .map(r => `  - ${r.method} ${r.url} (${r.status})`)
        .join('\n');

      throw new Error(
        `Critical network failures detected:\n${failures}\n\n` +
        `These requests failed and may indicate broken functionality.`
      );
    }

    expect(criticalFailures.length).toBe(0);
  }

  /**
   * Start performance tracing
   */
  static async startPerformanceTrace(): Promise<void> {
    // In actual implementation, this would call:
    // mcp__chrome_devtools__performance_start_trace()
    console.log(`[MCP] Start performance trace`);
  }

  /**
   * Stop performance tracing and get metrics
   */
  static async stopPerformanceTrace(): Promise<PerformanceTraceResult> {
    // In actual implementation, this would call:
    // mcp__chrome_devtools__performance_stop_trace()
    // followed by:
    // mcp__chrome_devtools__performance_analyze_insight()
    console.log(`[MCP] Stop performance trace and analyze`);

    return {
      metrics: {
        firstContentfulPaint: 800,
        largestContentfulPaint: 1500,
        timeToInteractive: 2000,
        totalLoadTime: 3000,
        domContentLoaded: 1000
      },
      insights: []
    };
  }

  /**
   * Assert page load performance meets requirements
   */
  static async assertPerformanceRequirements(
    maxLoadTime: number = 10000
  ): Promise<void> {
    const trace = await this.stopPerformanceTrace();
    const metrics = trace.metrics;

    const failures: string[] = [];

    if (metrics.totalLoadTime > maxLoadTime) {
      failures.push(
        `Total load time ${metrics.totalLoadTime}ms exceeds ${maxLoadTime}ms`
      );
    }

    if (metrics.firstContentfulPaint > 2000) {
      failures.push(
        `FCP ${metrics.firstContentfulPaint}ms exceeds 2000ms target`
      );
    }

    if (metrics.largestContentfulPaint > 4000) {
      failures.push(
        `LCP ${metrics.largestContentfulPaint}ms exceeds 4000ms target`
      );
    }

    if (metrics.timeToInteractive > 5000) {
      failures.push(
        `TTI ${metrics.timeToInteractive}ms exceeds 5000ms target`
      );
    }

    if (failures.length > 0) {
      throw new Error(
        `Performance requirements not met:\n${failures.map(f => `  - ${f}`).join('\n')}\n\n` +
        `These metrics must pass to ensure acceptable user experience.`
      );
    }

    expect(metrics.totalLoadTime).toBeLessThan(maxLoadTime);
  }

  /**
   * Evaluate JavaScript in the browser context
   */
  static async evaluateScript<T = any>(script: string): Promise<T> {
    // In actual implementation, this would call:
    // mcp__chrome_devtools__evaluate_script({ script })
    console.log(`[MCP] Evaluate script`);

    // Mock response for reference
    return {} as T;
  }

  /**
   * Resize viewport to specified dimensions
   */
  static async resizeViewport(width: number, height: number): Promise<void> {
    // In actual implementation, this would call:
    // mcp__chrome_devtools__resize_page({ width, height })
    console.log(`[MCP] Resize viewport to ${width}x${height}`);
  }

  /**
   * Wait for a condition (e.g., networkidle, element visible)
   */
  static async waitFor(
    condition: 'networkidle' | 'load' | 'domcontentloaded',
    timeout: number = 30000
  ): Promise<void> {
    // In actual implementation, this would call:
    // mcp__chrome_devtools__wait_for({ condition, timeout })
    console.log(`[MCP] Wait for ${condition} (timeout: ${timeout}ms)`);
  }

  /**
   * Helper to determine if a request is non-critical
   */
  private static isNonCriticalRequest(url: string): boolean {
    const nonCriticalPatterns = [
      '/analytics',
      '/tracking',
      '/metrics',
      '.svg',
      '.jpg',
      '.png',
      '.gif'
    ];

    return nonCriticalPatterns.some(pattern => url.includes(pattern));
  }
}

/**
 * Viewport presets for responsive testing
 */
export const Viewports = {
  mobile: { width: 375, height: 667, name: 'Mobile (iPhone SE)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (iPad)' },
  desktop: { width: 1920, height: 1080, name: 'Desktop (1080p)' },
  desktopLarge: { width: 2560, height: 1440, name: 'Desktop (1440p)' }
};

/**
 * Test flow helper for common E2E patterns
 */
export class TestFlow {
  /**
   * Full page validation flow:
   * 1. Navigate to URL
   * 2. Wait for page load
   * 3. Take screenshot
   * 4. Check console errors
   * 5. Check network failures
   */
  static async validatePage(
    url: string,
    screenshotPath: string
  ): Promise<void> {
    console.log(`\n=== Validating page: ${url} ===`);

    // Navigate
    await MCPTestHelpers.navigateTo(url);

    // Wait for network idle
    await MCPTestHelpers.waitFor('networkidle');

    // Take screenshot
    await MCPTestHelpers.takeScreenshot(screenshotPath);

    // Assert zero console errors
    await MCPTestHelpers.assertZeroConsoleErrors();

    // Assert no critical network failures
    await MCPTestHelpers.assertNoCriticalNetworkFailures();

    console.log(`✓ Page validation complete\n`);
  }

  /**
   * Performance validation flow:
   * 1. Navigate to URL
   * 2. Start performance trace
   * 3. Wait for page load
   * 4. Stop trace and analyze
   * 5. Assert performance requirements
   */
  static async validatePerformance(
    url: string,
    maxLoadTime: number = 10000
  ): Promise<void> {
    console.log(`\n=== Performance validation: ${url} ===`);

    // Start trace
    await MCPTestHelpers.startPerformanceTrace();

    // Navigate
    await MCPTestHelpers.navigateTo(url);

    // Wait for network idle
    await MCPTestHelpers.waitFor('networkidle');

    // Assert performance
    await MCPTestHelpers.assertPerformanceRequirements(maxLoadTime);

    console.log(`✓ Performance validation complete\n`);
  }

  /**
   * Responsive design validation flow:
   * 1. Test at multiple viewport sizes
   * 2. Take screenshots at each size
   * 3. Validate layout at each breakpoint
   */
  static async validateResponsive(
    url: string,
    screenshotBasePath: string
  ): Promise<void> {
    console.log(`\n=== Responsive validation: ${url} ===`);

    for (const [key, viewport] of Object.entries(Viewports)) {
      console.log(`Testing ${viewport.name}...`);

      // Resize viewport
      await MCPTestHelpers.resizeViewport(viewport.width, viewport.height);

      // Navigate
      await MCPTestHelpers.navigateTo(url);

      // Wait for load
      await MCPTestHelpers.waitFor('load');

      // Take screenshot
      const screenshotPath = `${screenshotBasePath}-${key}.png`;
      await MCPTestHelpers.takeScreenshot(screenshotPath);

      // Check console
      await MCPTestHelpers.assertZeroConsoleErrors();
    }

    console.log(`✓ Responsive validation complete\n`);
  }
}
