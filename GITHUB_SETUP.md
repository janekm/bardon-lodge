# GitHub Actions Setup Guide

This guide explains how to set up the GitHub repository for automated CI/CD with Cloudflare Workers deployment.

## Overview

The project uses two GitHub Actions workflows:

- **CI Workflow**: Runs tests, linting, and builds on pull requests and pushes
- **Deploy Workflow**: Deploys to staging (PRs) and production (main branch)

## Prerequisites

1. GitHub repository with the project code
2. Cloudflare account with Workers and D1 access
3. Cloudflare API token with appropriate permissions

## Step 1: Create Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Use **"Custom token"** template
4. Configure the token with these permissions:
   - **Account**: `Cloudflare Workers:Edit`
   - **Zone**: `Zone:Read` (for your domain)
   - **Account**: `Account:Read`
   - **Account**: `D1:Edit`

5. Set **Account Resources** to include your Cloudflare account
6. Set **Zone Resources** to include your domain (if using custom domains)
7. Click **"Continue to summary"** and **"Create Token"**
8. **Copy the token** - you'll need it for GitHub secrets

## Step 2: Find Your Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. In the right sidebar, copy your **Account ID**

## Step 3: Create Production D1 Database

```bash
# Create production database
npx wrangler d1 create bardon-lodge-directors-prod

# Copy the database_id from the output and update wrangler.toml
```

Update the `database_id` in `wrangler.toml` for the production environment:

```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "bardon-lodge-directors-prod"
database_id = "your-production-database-id-here" # Replace this
migrations_dir = "migrations"
```

## Step 4: Configure GitHub Repository Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these secrets:

### Required Secrets

| Secret Name             | Value                       | Description                        |
| ----------------------- | --------------------------- | ---------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Your API token from Step 1  | Used for deployment authentication |
| `CLOUDFLARE_ACCOUNT_ID` | Your Account ID from Step 2 | Cloudflare account identifier      |

## Step 5: Configure GitHub Environments

1. Go to **Settings** → **Environments**
2. Create two environments:

### Production Environment

- **Name**: `production`
- **Protection rules**:
  - ✅ Required reviewers (add team members)
  - ✅ Restrict pushes to protected branches
  - ✅ Wait timer: 0 minutes
- **Environment secrets**: None needed (uses repository secrets)

### Staging Environment

- **Name**: `staging`
- **Protection rules**: None (allows automatic deployment)
- **Environment secrets**: None needed (uses repository secrets)

## Step 6: Configure Branch Protection

1. Go to **Settings** → **Branches**
2. Click **"Add rule"** for the `main` branch
3. Configure these settings:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - **Status checks**: Select these when they appear:
     - `test` (Test and Build)
     - `lint` (Lint and Format Check)
     - `security` (Security Audit)
   - ✅ Require conversation resolution before merging
   - ✅ Include administrators

## Step 7: Install Dependencies and Verify Setup

```bash
# Install new dependencies
npm install

# Run linting and formatting
npm run lint
npm run format

# Run type checking
npm run type-check

# Run tests
npm test

# Build the project
npm run build
```

## Step 8: Test the Workflows

### Testing CI Workflow

1. Create a new branch: `git checkout -b test-ci`
2. Make a small change (e.g., update README.md)
3. Commit and push: `git add . && git commit -m "test: verify CI workflow" && git push origin test-ci`
4. Create a pull request
5. Verify that CI workflow runs and passes

### Testing Deploy Workflow

1. Merge the test PR to main branch
2. Verify that deploy workflow runs
3. Check that production deployment succeeds

## Workflow Behavior

### On Pull Requests

- ✅ Runs CI workflow (test, lint, build)
- ✅ Deploys to staging environment
- ✅ Adds comment with staging URL
- ✅ Requires approval for production deployment

### On Main Branch Push

- ✅ Runs CI workflow
- ✅ Applies D1 migrations to production
- ✅ Deploys to production environment
- ✅ Updates deployment status

## Troubleshooting

### Common Issues

**1. "Could not authenticate" error**

- Verify `CLOUDFLARE_API_TOKEN` is correct
- Check token permissions include Workers and D1 edit access

**2. "Account not found" error**

- Verify `CLOUDFLARE_ACCOUNT_ID` is correct
- Ensure token has account read permissions

**3. "Database not found" error**

- Verify database IDs in `wrangler.toml` are correct
- Ensure databases exist in Cloudflare dashboard

**4. CI workflow fails on dependencies**

- Check Node.js version matches (22.17.1)
- Verify all dependencies are in package.json
- Clear npm cache if needed

**5. Linting errors**

- Run `npm run lint:fix` to auto-fix issues
- Check `.eslintrc.cjs` configuration
- Ensure all files follow coding standards

### Deployment URLs

- **Production**: https://directors.bardonlodge.co.uk (configure custom domain)
- **Staging**: https://staging-directors.bardonlodge.co.uk (configure custom domain)
- **Worker URLs**: Available in Cloudflare dashboard

## Security Considerations

1. **API Token Security**:
   - Use minimal required permissions
   - Rotate tokens regularly
   - Never expose tokens in code or logs

2. **Environment Protection**:
   - Production requires manual approval
   - Staging allows automatic deployment
   - Branch protection prevents direct pushes

3. **Database Security**:
   - Production and staging use separate databases
   - Migrations are applied automatically
   - Backup strategies should be implemented

## Monitoring and Maintenance

1. **GitHub Actions**:
   - Monitor workflow runs in Actions tab
   - Check for failed deployments
   - Review security audit results

2. **Cloudflare**:
   - Monitor Workers analytics
   - Check D1 database health
   - Review error logs and metrics

3. **Dependencies**:
   - Update dependencies regularly
   - Monitor security advisories
   - Keep Wrangler CLI updated

## Commands Reference

```bash
# Development
npm run dev              # Start local development server
npm run build           # Build for production
npm run preview         # Preview production build

# Testing and Quality
npm test                # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run type-check      # TypeScript type checking
npm run lint            # Run ESLint
npm run lint:fix        # Fix linting issues
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting

# Deployment
npm run deploy:staging  # Deploy to staging manually
npm run deploy:prod     # Deploy to production manually

# Database
npx wrangler d1 migrations apply <db-name> --local   # Apply migrations locally
npx wrangler d1 migrations apply <db-name> --remote  # Apply migrations remotely
```

This setup provides a robust CI/CD pipeline with proper testing, linting, security checks, and automated deployments to both staging and production environments.
