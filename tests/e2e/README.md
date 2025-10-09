# E2E Tests with Chrome DevTools MCP Integration

## Overview

These E2E tests validate deployment correctness using Chrome DevTools MCP integration. They provide comprehensive verification of:

- **Authentication Flow**: Login page rendering and form elements
- **Onboarding Wizard**: Multi-step onboarding flow display
- **Vault Page**: Main application interface and upload functionality
- **Console Error Detection**: Zero-tolerance policy for console errors
- **Performance Validation**: Page load times and Core Web Vitals
- **Mobile Responsiveness**: Testing across mobile, tablet, and desktop viewports
- **Accessibility Compliance**: WCAG 2.1 AA validation

## Test Structure

### Files

- `deployment-verification.spec.ts` - Main E2E test suite for deployment verification
- `../screenshots/deployment-verification/` - Screenshot storage directory

### Test Categories

1. **Authentication Flow Test**
   - Verifies login page renders correctly
   - Checks for email/password inputs and submit button
   - Takes screenshots for visual validation
   - Asserts zero console errors

2. **Onboarding Flow Test**
   - Validates onboarding wizard display
   - Verifies form fields and step indicators
   - Captures screenshots of wizard flow
   - Checks console for errors

3. **Vault Page Test**
   - Tests main vault page rendering
   - Verifies "Upload Document" button presence
   - Validates page layout and structure
   - Screenshots main interface

4. **Console Error Validation**
   - Runs console checks on all pages
   - **BLOCKS PR** if any console.error messages found
   - Validates network requests (no 4xx/5xx on critical resources)

5. **Performance Validation**
   - Measures page load times (p95 < 10s requirement)
   - Validates Core Web Vitals:
     - First Contentful Paint (FCP) < 2s
     - Largest Contentful Paint (LCP) < 4s
     - Time to Interactive (TTI) < 5s
   - Uses Chrome DevTools performance tracing

6. **Mobile Responsiveness**
   - Tests mobile viewport (375x667 - iPhone SE)
   - Tests tablet viewport (768x1024 - iPad)
   - Tests desktop viewport (1920x1080 - 1080p)
   - Captures screenshots at each breakpoint
   - Validates touch targets >= 44px on mobile

7. **Accessibility Validation**
   - Checks for semantic HTML landmarks
   - Validates ARIA labels on interactive elements
   - Ensures proper heading hierarchy
   - Verifies alt text on images
   - Tests keyboard navigation support

## Chrome DevTools MCP Tools Used

### Navigation & Automation
- `mcp__chrome_devtools__navigate_page` - Navigate to URLs
- `mcp__chrome_devtools__wait_for` - Wait for conditions (networkidle, etc.)
- `mcp__chrome_devtools__resize_page` - Change viewport size

### Debugging & Validation
- `mcp__chrome_devtools__list_console_messages` - Get console logs/errors
- `mcp__chrome_devtools__list_network_requests` - Inspect network activity
- `mcp__chrome_devtools__evaluate_script` - Run JavaScript in browser context
- `mcp__chrome_devtools__take_screenshot` - Capture visual state

### Performance Testing
- `mcp__chrome_devtools__performance_start_trace` - Begin performance tracing
- `mcp__chrome_devtools__performance_stop_trace` - End performance tracing
- `mcp__chrome_devtools__performance_analyze_insight` - Analyze performance data

## Running Tests

### Prerequisites

1. **Chrome DevTools MCP Server** must be configured in your MCP settings:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated", "--headless"]
    }
  }
}
```

2. **Deployment URL** must be accessible:
   - Default: `https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app`
   - Can be overridden in test file

### Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx vitest run tests/e2e/deployment-verification.spec.ts

# Run in watch mode (for development)
npx vitest tests/e2e/deployment-verification.spec.ts
```

### View Screenshots

After running tests, screenshots are stored in:

```
tests/screenshots/deployment-verification/
├── 01-login-page.png
├── 02-onboarding-wizard.png
├── 03-vault-page.png
├── 04-mobile-vault.png
├── 05-tablet-vault.png
└── 06-desktop-vault.png
```

## Test Philosophy

### Non-Destructive Testing

**IMPORTANT**: These tests DO NOT:
- Submit forms or mutate data
- Create user accounts
- Upload files to the database
- Modify application state

They ONLY:
- Navigate to pages
- Capture visual state via screenshots
- Validate client-side rendering
- Check console logs and network requests
- Measure performance metrics

This ensures tests can run against production deployments without polluting the database.

### Medical Safety Validation

For medical applications, these tests enforce:

1. **Zero Console Errors Policy**
   - Any console.error or unhandled exception BLOCKS PR
   - Medical apps cannot tolerate client-side errors
   - User trust depends on application stability

2. **Performance Requirements**
   - p95 page load time < 10s (per PRD NFR)
   - Fast performance is critical for healthcare workflows
   - Slow applications lead to clinician frustration

3. **Accessibility Compliance**
   - WCAG 2.1 AA required for medical apps
   - Ensures usability for all users, including those with disabilities
   - Legal and ethical requirement in healthcare

## Integration with CI/CD

These tests should run:

1. **Before PR Creation** (via `pr-validation-orchestrator` subagent)
2. **After Deployment to Staging/Production**
3. **As Part of Smoke Tests** (via `./scripts/smoke-e2e.sh`)

Example CI workflow:

```yaml
- name: Run E2E Deployment Verification
  run: |
    npm run test:e2e
  env:
    DEPLOYMENT_URL: ${{ secrets.DEPLOYMENT_URL }}
```

## Troubleshooting

### Chrome DevTools MCP Not Available

If MCP tools are not available, check:

1. MCP server is configured in `~/.config/claude/config.json`
2. `chrome-devtools-mcp` package is installed globally
3. Chrome browser is installed on the system

### Screenshots Not Captured

Ensure the screenshot directory exists:

```bash
mkdir -p tests/screenshots/deployment-verification
```

### Performance Tests Failing

If performance tests fail:

1. Check network conditions (slow network can affect results)
2. Verify deployment is not under heavy load
3. Run tests multiple times to ensure consistency
4. Consider raising timeout limits if infrastructure is slow

### Console Errors Detected

If console errors are found:

1. Review `list_console_messages` output for details
2. Fix client-side JavaScript errors before merging
3. Ensure all API endpoints return proper responses
4. Check for missing assets or broken image links

## Best Practices

### When to Run These Tests

- **Always** before creating a PR (mandatory via subagent)
- **Always** after deploying to staging/production
- **Always** when modifying UI components
- **Always** when changing API contracts

### When to Update These Tests

- When adding new pages or routes
- When modifying authentication/onboarding flows
- When changing critical user interactions
- When performance requirements change

### Screenshot Baseline Management

Screenshots serve as visual baselines. Update them when:

- UI design intentionally changes
- Layout or styling is refactored
- New features are added to pages

Store baseline screenshots in version control for comparison.

## Future Enhancements

Potential improvements for this test suite:

1. **Visual Regression Testing**
   - Compare screenshots against baselines using image diff tools
   - Automatically detect unintended visual changes

2. **Network Throttling**
   - Use `mcp__chrome_devtools__emulate_network` to test on slow connections
   - Validate performance under 3G/4G conditions

3. **CPU Throttling**
   - Use `mcp__chrome_devtools__emulate_cpu` to simulate low-end devices
   - Ensure performance on budget hardware

4. **Form Interaction Tests**
   - Use `mcp__chrome_devtools__fill_form` and `mcp__chrome_devtools__click`
   - Test full user flows (with test data, not production)

5. **Automated Accessibility Audits**
   - Integrate axe-core or similar tools via evaluate_script
   - Generate comprehensive accessibility reports

## References

- [Chrome DevTools MCP Documentation](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [CLAUDE.md - Chrome DevTools MCP Integration](../../CLAUDE.md#chrome-devtools-mcp-integration)
- [Vitest Documentation](https://vitest.dev/)
- [Core Web Vitals](https://web.dev/vitals/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
