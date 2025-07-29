# Branch Protection Configuration

This document outlines the recommended branch protection rules for the main branch to ensure secure npm package publishing.

## GitHub Repository Settings

### 1. Branch Protection Rules for `main`

Navigate to: **Settings** → **Branches** → **Add rule**

**Branch name pattern**: `main`

**Protect matching branches**:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1`
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from CODEOWNERS
  - ✅ Restrict pushes that create new files

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks**:
    - `test (18.x)`
    - `test (20.x)` 
    - `test (22.x)`
    - `security`

- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits**

- ✅ **Require linear history**

- ✅ **Restrict pushes that create new files**

- ✅ **Include administrators** (applies rules to admins too)

### 2. Repository Secrets

Navigate to: **Settings** → **Secrets and variables** → **Actions**

**Required secrets**:
- `NPM_TOKEN`: Your npm publishing token with publish permissions
  - Generate at: https://www.npmjs.com/settings/tokens
  - Choose "Automation" token type for CI/CD

**Optional secrets**:
- `SLACK_WEBHOOK`: For deployment notifications
- `DISCORD_WEBHOOK`: For deployment notifications

### 3. Environment Protection Rules

Navigate to: **Settings** → **Environments**

**Create environment**: `production`

**Environment protection rules**:
- ✅ **Required reviewers**: Add team members who can approve deployments
- ✅ **Wait timer**: `5` minutes (optional - allows time to cancel accidental deploys)
- ✅ **Deployment branches**: Only `main` branch

## Workflow Security Features

### ✅ **Npm Provenance**
- Automatically generates build attestations
- Links packages to source code and build process
- Verifies package authenticity

### ✅ **Multi-Node Testing**
- Tests on Node.js 18.x, 20.x, 22.x
- Ensures compatibility across versions

### ✅ **Security Scanning**
- `npm audit` for known vulnerabilities
- Dependency security checks

### ✅ **Build Verification**
- Compiles TypeScript successfully
- Tests all module exports
- Validates package integrity

## Release Process

### Automated Release (Recommended)
1. Create and merge PR to `main`
2. Manually trigger "Release and Publish" workflow
3. Choose version type (patch/minor/major)
4. Workflow automatically:
   - Bumps version
   - Creates git tag
   - Creates GitHub release
   - Publishes to npm with provenance
   - Publishes to GitHub Packages

### Manual Release (Fallback)
1. Create git tag: `git tag v1.0.1`
2. Push tag: `git push origin v1.0.1`
3. Release workflow triggers automatically

## Security Best Practices

### ✅ **Two-Factor Authentication**
- Enable 2FA on GitHub account
- Enable 2FA on npm account

### ✅ **Minimal Permissions**
- npm token has only publish permissions
- GitHub token uses minimal required scopes

### ✅ **Signed Commits**
- All commits to main must be signed
- Prevents unauthorized code injection

### ✅ **Code Review**
- All changes require PR review
- CODEOWNERS file enforces expert review

## Monitoring

### GitHub Notifications
- Watch repository for security alerts
- Enable notifications for failed workflows

### npm Package Monitoring
- Monitor download statistics
- Watch for security advisories
- Enable npm security notifications

## Emergency Procedures

### Package Compromise
1. **Immediately revoke npm token**
2. **Unpublish compromised versions** (if within 24 hours)
3. **Create security advisory**
4. **Generate new npm token**
5. **Update repository secrets**

### Unauthorized Access
1. **Review recent commits and releases**
2. **Check npm package versions**
3. **Rotate all tokens and secrets**
4. **Enable additional security measures**

## Implementation Checklist

- [ ] Configure branch protection rules
- [ ] Add NPM_TOKEN secret
- [ ] Test CI workflow on PR
- [ ] Test release workflow
- [ ] Enable repository security features
- [ ] Add CODEOWNERS file
- [ ] Configure team permissions
- [ ] Set up monitoring and alerts