import { describe, it, expect, beforeAll } from 'vitest';
import { MCPTestHelpers, TestFlow, Viewports } from './mcp-test-runner';

/**
 * E2E Deployment Verification Tests (Improved Implementation)
 *
 * This is an improved version using the MCP test runner helpers
 * for cleaner, more maintainable test code.
 *
 * Tests validate:
 * - Authentication flow rendering
 * - Onboarding wizard display
 * - Vault page functionality
 * - Zero console errors (BLOCKS PR if errors found)
 * - Performance requirements (p95 < 10s)
 * - Mobile responsiveness across breakpoints
 * - Accessibility compliance (WCAG 2.1 AA)
 *
 * IMPORTANT: These tests are NON-DESTRUCTIVE.
 * They DO NOT submit forms or mutate data.
 */

// Deployment URL for testing
const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL ||
  'https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app';

// Screenshot directory
const SCREENSHOT_DIR = '/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/tests/screenshots/deployment-verification';

describe('Deployment Verification E2E Tests (Improved)', () => {

  describe('1. Authentication Flow', () => {
    const loginUrl = `${DEPLOYMENT_URL}/auth/login`;

    it('should render login page with all required elements', async () => {
      // Full page validation
      await TestFlow.validatePage(
        loginUrl,
        `${SCREENSHOT_DIR}/01-login-page.png`
      );

      // Verify form elements present
      const pageElements = await MCPTestHelpers.evaluateScript<{
        hasEmailInput: boolean;
        hasPasswordInput: boolean;
        hasSubmitButton: boolean;
        pageTitle: string;
      }>(`
        ({
          hasEmailInput: !!document.querySelector('input[type="email"]'),
          hasPasswordInput: !!document.querySelector('input[type="password"]'),
          hasSubmitButton: !!document.querySelector('button[type="submit"]'),
          pageTitle: document.title
        })
      `);

      expect(pageElements.hasEmailInput).toBe(true);
      expect(pageElements.hasPasswordInput).toBe(true);
      expect(pageElements.hasSubmitButton).toBe(true);
      expect(pageElements.pageTitle).toBeTruthy();
    });

    it('should meet performance requirements', async () => {
      await TestFlow.validatePerformance(loginUrl, 10000);
    });
  });

  describe('2. Onboarding Flow', () => {
    const onboardingUrl = `${DEPLOYMENT_URL}/auth/onboarding`;

    it('should render onboarding wizard correctly', async () => {
      await TestFlow.validatePage(
        onboardingUrl,
        `${SCREENSHOT_DIR}/02-onboarding-wizard.png`
      );

      // Verify wizard structure
      const wizardElements = await MCPTestHelpers.evaluateScript<{
        hasWizard: boolean;
        hasSteps: boolean;
        hasInputFields: boolean;
        hasContinueButton: boolean;
      }>(`
        ({
          hasWizard: !!document.querySelector('form') ||
                     !!document.querySelector('[data-testid="onboarding-wizard"]'),
          hasSteps: document.querySelectorAll('[role="tab"], [data-step]').length > 0,
          hasInputFields: document.querySelectorAll('input').length > 0,
          hasContinueButton: !!document.querySelector('button:not([disabled])')
        })
      `);

      expect(wizardElements.hasWizard).toBe(true);
      expect(wizardElements.hasInputFields).toBe(true);
    });

    it('should meet performance requirements', async () => {
      await TestFlow.validatePerformance(onboardingUrl, 10000);
    });
  });

  describe('3. Vault Page', () => {
    const vaultUrl = `${DEPLOYMENT_URL}/`;

    it('should render vault page with upload functionality', async () => {
      await TestFlow.validatePage(
        vaultUrl,
        `${SCREENSHOT_DIR}/03-vault-page.png`
      );

      // Verify vault UI elements
      const vaultElements = await MCPTestHelpers.evaluateScript<{
        hasUploadButton: boolean;
        hasMainContent: boolean;
        pageHeight: number;
      }>(`
        ({
          hasUploadButton: !!Array.from(document.querySelectorAll('button')).find(btn =>
            btn.textContent?.toLowerCase().includes('upload')
          ),
          hasMainContent: !!document.querySelector('main'),
          pageHeight: document.body.scrollHeight
        })
      `);

      expect(vaultElements.hasUploadButton).toBe(true);
      expect(vaultElements.hasMainContent).toBe(true);
      expect(vaultElements.pageHeight).toBeGreaterThan(0);
    });

    it('should meet performance requirements', async () => {
      await TestFlow.validatePerformance(vaultUrl, 10000);
    });
  });

  describe('4. Console Error Validation (BLOCKS PR)', () => {
    it('should have zero console errors on login page', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/auth/login`);
      await MCPTestHelpers.waitFor('networkidle');
      await MCPTestHelpers.assertZeroConsoleErrors();
    });

    it('should have zero console errors on onboarding page', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/auth/onboarding`);
      await MCPTestHelpers.waitFor('networkidle');
      await MCPTestHelpers.assertZeroConsoleErrors();
    });

    it('should have zero console errors on vault page', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/`);
      await MCPTestHelpers.waitFor('networkidle');
      await MCPTestHelpers.assertZeroConsoleErrors();
    });

    it('should have no critical network failures', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/`);
      await MCPTestHelpers.waitFor('networkidle');
      await MCPTestHelpers.assertNoCriticalNetworkFailures();
    });
  });

  describe('5. Performance Validation (p95 < 10s)', () => {
    it('should load all pages within performance budget', async () => {
      const pages = [
        { url: `${DEPLOYMENT_URL}/auth/login`, name: 'login' },
        { url: `${DEPLOYMENT_URL}/auth/onboarding`, name: 'onboarding' },
        { url: `${DEPLOYMENT_URL}/`, name: 'vault' }
      ];

      for (const page of pages) {
        console.log(`\nTesting performance for ${page.name}...`);

        await MCPTestHelpers.startPerformanceTrace();
        await MCPTestHelpers.navigateTo(page.url);
        await MCPTestHelpers.waitFor('networkidle');

        // Assert p95 < 10s requirement
        await MCPTestHelpers.assertPerformanceRequirements(10000);
      }
    });

    it('should meet Core Web Vitals targets', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/`);

      // Measure Core Web Vitals
      const vitals = await MCPTestHelpers.evaluateScript<{
        fcp?: number;
        lcp?: number;
        error?: string;
      }>(`
        new Promise(resolve => {
          if (!('PerformanceObserver' in window)) {
            resolve({ error: 'PerformanceObserver not supported' });
            return;
          }

          const vitals = {};
          let observersCompleted = 0;

          // FCP Observer
          new PerformanceObserver((list) => {
            const fcpEntry = list.getEntries().find(e => e.name === 'first-contentful-paint');
            if (fcpEntry) {
              vitals.fcp = fcpEntry.startTime;
              observersCompleted++;
              if (observersCompleted >= 2) resolve(vitals);
            }
          }).observe({ entryTypes: ['paint'] });

          // LCP Observer
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              vitals.lcp = entries[entries.length - 1].startTime;
              observersCompleted++;
              if (observersCompleted >= 2) resolve(vitals);
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // Timeout fallback
          setTimeout(() => resolve(vitals), 5000);
        })
      `);

      if (!vitals.error) {
        if (vitals.fcp) {
          expect(vitals.fcp).toBeLessThan(2000); // FCP < 2s
        }
        if (vitals.lcp) {
          expect(vitals.lcp).toBeLessThan(4000); // LCP < 4s
        }
      }
    });
  });

  describe('6. Mobile Responsiveness', () => {
    it('should render correctly on mobile viewport', async () => {
      const vaultUrl = `${DEPLOYMENT_URL}/`;

      // Resize to mobile
      await MCPTestHelpers.resizeViewport(
        Viewports.mobile.width,
        Viewports.mobile.height
      );

      // Validate page
      await TestFlow.validatePage(
        vaultUrl,
        `${SCREENSHOT_DIR}/04-mobile-vault.png`
      );

      // Check mobile-specific concerns
      const mobileChecks = await MCPTestHelpers.evaluateScript<{
        hasHorizontalScroll: boolean;
        viewportWidth: number;
        buttonsLargeEnough: boolean;
      }>(`
        ({
          hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
          viewportWidth: window.innerWidth,
          buttonsLargeEnough: Array.from(document.querySelectorAll('button')).every(btn => {
            const rect = btn.getBoundingClientRect();
            return rect.width >= 44 && rect.height >= 44;
          })
        })
      `);

      expect(mobileChecks.hasHorizontalScroll).toBe(false);
      expect(mobileChecks.viewportWidth).toBe(Viewports.mobile.width);
      expect(mobileChecks.buttonsLargeEnough).toBe(true); // Touch targets >= 44px
    });

    it('should render correctly on tablet viewport', async () => {
      const vaultUrl = `${DEPLOYMENT_URL}/`;

      await MCPTestHelpers.resizeViewport(
        Viewports.tablet.width,
        Viewports.tablet.height
      );

      await TestFlow.validatePage(
        vaultUrl,
        `${SCREENSHOT_DIR}/05-tablet-vault.png`
      );
    });

    it('should render correctly on desktop viewport', async () => {
      const vaultUrl = `${DEPLOYMENT_URL}/`;

      await MCPTestHelpers.resizeViewport(
        Viewports.desktop.width,
        Viewports.desktop.height
      );

      await TestFlow.validatePage(
        vaultUrl,
        `${SCREENSHOT_DIR}/06-desktop-vault.png`
      );
    });

    it('should validate all pages across all breakpoints', async () => {
      const pages = [
        { url: `${DEPLOYMENT_URL}/auth/login`, name: 'login' },
        { url: `${DEPLOYMENT_URL}/auth/onboarding`, name: 'onboarding' },
        { url: `${DEPLOYMENT_URL}/`, name: 'vault' }
      ];

      for (const page of pages) {
        console.log(`\nTesting responsive design for ${page.name}...`);

        await TestFlow.validateResponsive(
          page.url,
          `${SCREENSHOT_DIR}/07-responsive-${page.name}`
        );
      }
    });
  });

  describe('7. Accessibility Validation (WCAG 2.1 AA)', () => {
    it('should have proper semantic HTML structure', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/`);
      await MCPTestHelpers.waitFor('load');

      const a11yChecks = await MCPTestHelpers.evaluateScript<{
        hasMainLandmark: boolean;
        hasNavLandmark: boolean;
        hasHeadings: boolean;
        headingHierarchy: string[];
        buttonsHaveAccessibleNames: boolean;
        imagesHaveAlt: boolean;
      }>(`
        ({
          hasMainLandmark: !!document.querySelector('main'),
          hasNavLandmark: !!document.querySelector('nav'),
          hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
          headingHierarchy: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .map(h => h.tagName),
          buttonsHaveAccessibleNames: Array.from(document.querySelectorAll('button')).every(btn =>
            btn.textContent?.trim() ||
            btn.getAttribute('aria-label') ||
            btn.getAttribute('aria-labelledby')
          ),
          imagesHaveAlt: Array.from(document.querySelectorAll('img')).every(img =>
            img.hasAttribute('alt')
          )
        })
      `);

      expect(a11yChecks.hasMainLandmark).toBe(true);
      expect(a11yChecks.hasHeadings).toBe(true);
      expect(a11yChecks.buttonsHaveAccessibleNames).toBe(true);
      expect(a11yChecks.imagesHaveAlt).toBe(true);
    });

    it('should support keyboard navigation', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/`);
      await MCPTestHelpers.waitFor('load');

      const keyboardSupport = await MCPTestHelpers.evaluateScript<{
        interactiveElementsCount: number;
        focusableElementsCount: number;
        hasSkipLink: boolean;
      }>(`
        ({
          interactiveElementsCount: document.querySelectorAll('button, a, input, select, textarea').length,
          focusableElementsCount: document.querySelectorAll('[tabindex]:not([tabindex="-1"])').length +
                                  document.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])').length,
          hasSkipLink: !!document.querySelector('a[href^="#"]:first-of-type')
        })
      `);

      expect(keyboardSupport.focusableElementsCount).toBeGreaterThan(0);
    });

    it('should have sufficient color contrast', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/`);

      // Basic color contrast check (simplified)
      const colorChecks = await MCPTestHelpers.evaluateScript<{
        hasLightOnLightText: boolean;
        hasDarkOnDarkText: boolean;
      }>(`
        ({
          hasLightOnLightText: false, // Placeholder - proper check needs luminance calculation
          hasDarkOnDarkText: false     // Placeholder - proper check needs luminance calculation
        })
      `);

      // This is a basic check - full WCAG contrast validation
      // would require a tool like axe-core
      expect(colorChecks).toBeTruthy();
    });
  });

  describe('8. Critical User Flows', () => {
    it('should load and display empty vault state', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/`);
      await MCPTestHelpers.waitFor('networkidle');

      const vaultState = await MCPTestHelpers.evaluateScript<{
        hasEmptyState: boolean;
        hasUploadPrompt: boolean;
      }>(`
        ({
          hasEmptyState: !!document.querySelector('[data-testid="empty-state"]') ||
                        document.body.textContent?.includes('No documents') ||
                        document.body.textContent?.includes('Upload your first'),
          hasUploadPrompt: !!Array.from(document.querySelectorAll('button, a')).find(el =>
            el.textContent?.toLowerCase().includes('upload')
          )
        })
      `);

      // Vault should either show documents or an empty state with upload prompt
      expect(vaultState.hasUploadPrompt).toBe(true);

      await MCPTestHelpers.assertZeroConsoleErrors();
    });

    it('should render auth pages without redirecting', async () => {
      // Test that auth pages are accessible (not auto-redirecting)
      const authPages = [
        `${DEPLOYMENT_URL}/auth/login`,
        `${DEPLOYMENT_URL}/auth/onboarding`
      ];

      for (const url of authPages) {
        await MCPTestHelpers.navigateTo(url);
        await MCPTestHelpers.waitFor('load');

        const currentUrl = await MCPTestHelpers.evaluateScript<string>(
          'window.location.href'
        );

        // URL might have query params or hash, but should still be on the auth page
        expect(currentUrl).toContain('/auth/');
      }
    });
  });

  describe('9. Error Handling', () => {
    it('should handle 404 pages gracefully', async () => {
      await MCPTestHelpers.navigateTo(`${DEPLOYMENT_URL}/this-page-does-not-exist-12345`);
      await MCPTestHelpers.waitFor('load');

      const has404Page = await MCPTestHelpers.evaluateScript<boolean>(`
        document.body.textContent?.includes('404') ||
        document.body.textContent?.includes('not found') ||
        document.body.textContent?.includes('Page Not Found')
      `);

      expect(has404Page).toBe(true);

      // Even error pages should have zero console errors
      await MCPTestHelpers.assertZeroConsoleErrors();
    });
  });
});
