# GitHub Actions Workflows

## Overview

This repository uses GitHub Actions for continuous integration and deployment. All workflows are automatically triggered based on specific events.

## Workflows

### 1. PR Tests (`pr-tests.yml`)
**Trigger**: Pull requests to `main` or `develop` branches  
**Purpose**: Comprehensive testing before merging

#### Jobs:
- **Lint and Type Check**: Validates code quality and TypeScript types
- **Frontend Unit Tests**: Runs Jest tests with coverage
- **Backend Unit Tests**: Runs pytest with coverage
- **E2E Tests**: Playwright browser tests
- **Security Scan**: Trivy vulnerability scanning

### 2. Test Suite (`test.yml`)
**Trigger**: Push to `main` or `develop` branches  
**Purpose**: Full test suite on main branches

#### Jobs:
- **Frontend Tests**: Type checking, linting, and unit tests
- **Backend Tests**: Python unit tests with Redis service
- **E2E Tests**: Full end-to-end testing
- **Performance Tests**: Runs on main branch only
- **Security Scan**: Vulnerability scanning with SARIF upload

### 3. Deploy to Vercel (`deploy.yml`)
**Trigger**: Push to `main` branch or manual workflow dispatch  
**Purpose**: Production deployment with quality gates

#### Jobs:
- **Test Before Deploy**: Runs tests to ensure quality
- **Deploy Production**: Deploys to production environment
- **Deploy Preview**: Creates preview deployments for PRs
- **Lighthouse Check**: Performance monitoring post-deployment

## Required Secrets

Configure these in GitHub Settings → Secrets:

### Vercel Deployment
- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

### Optional (for enhanced features)
- `CODECOV_TOKEN`: For coverage reporting
- `GITHUB_TOKEN`: Automatically provided by GitHub

## Getting Vercel Secrets

1. **Get Vercel Token**:
   ```bash
   # Visit https://vercel.com/account/tokens
   # Create a new token with "Full Access" scope
   ```

2. **Get Organization and Project IDs**:
   ```bash
   cd frontend
   npx vercel link
   # This creates .vercel/project.json with the IDs
   cat .vercel/project.json
   ```

3. **Add to GitHub**:
   - Go to your repository on GitHub
   - Navigate to Settings → Secrets and variables → Actions
   - Add the three secrets

## Workflow Features

### Automated Testing
- ✅ Type checking and linting
- ✅ Unit tests with coverage reports
- ✅ E2E tests with Playwright
- ✅ Performance testing
- ✅ Security vulnerability scanning

### Deployment Features
- 🚀 Automatic production deployment on main branch
- 🔍 Preview deployments for pull requests
- 📊 Lighthouse performance monitoring
- 💬 PR comments with deployment URLs
- 📈 GitHub deployment status tracking

### Quality Gates
- Tests must pass before deployment
- Type checking enforced
- Linting standards maintained
- Security vulnerabilities checked

## Running Workflows Manually

Some workflows support manual triggering:

```bash
# Using GitHub CLI
gh workflow run deploy.yml --field environment=staging

# Or through GitHub UI
# Actions → Deploy to Vercel → Run workflow
```

## Branch Protection

Recommended branch protection rules for `main`:

1. Require pull request reviews
2. Require status checks to pass:
   - `Lint and Type Check`
   - `Frontend Unit Tests`
   - `Backend Unit Tests`
   - `E2E Tests`
3. Require branches to be up to date
4. Include administrators in restrictions

## Monitoring

### Test Results
- Check Actions tab for workflow runs
- Coverage reports uploaded to Codecov
- Test summaries in workflow logs

### Deployment Status
- GitHub Deployments tab shows history
- Vercel dashboard for detailed metrics
- Lighthouse scores in workflow summaries

## Troubleshooting

### Common Issues

1. **Vercel deployment fails**:
   - Check VERCEL_TOKEN is valid
   - Verify organization and project IDs
   - Ensure vercel.json is properly configured

2. **Tests timeout**:
   - E2E tests may need more time for setup
   - Adjust timeouts in playwright.config.ts

3. **Cache issues**:
   - Clear GitHub Actions cache in Settings
   - Update cache keys in workflows

### Debug Mode

Enable debug logging:
```yaml
env:
  ACTIONS_RUNNER_DEBUG: true
  ACTIONS_STEP_DEBUG: true
```

## Contributing

When adding new workflows:
1. Test locally with `act` if possible
2. Use concurrency groups to prevent conflicts
3. Add appropriate permissions
4. Document required secrets
5. Update this README

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Playwright Documentation](https://playwright.dev)
- [Codecov Documentation](https://docs.codecov.com)