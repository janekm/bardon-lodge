# Cloudflare Environment Setup Guide

This guide walks you through setting up staging and production environments for the Bardon Lodge Directors email alias system manually in Cloudflare.

## Overview

We'll create two environments:
- **Staging**: For testing changes before production
- **Production**: For live email forwarding

## Prerequisites

1. Cloudflare account with domain `bardonlodge.co.uk`
2. Wrangler CLI installed and authenticated
3. Node.js and npm installed locally

## Step 1: Create Production D1 Database

```bash
# Create production database
npx wrangler d1 create bardon-lodge-directors-prod

# Note the database_id from the output
```

You'll get output like:
```
✅ Successfully created DB 'bardon-lodge-directors-prod' in region WNAM
Created your new D1 database.

{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "bardon-lodge-directors-prod",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ]
}
```

Update `wrangler.toml` with the production database ID:

```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "bardon-lodge-directors-prod"
database_id = "your-production-database-id-here"  # Replace with actual ID
migrations_dir = "migrations"
```

## Step 2: Apply Database Migrations

Apply migrations to both staging and production databases:

```bash
# Apply to staging (local development database)
npx wrangler d1 migrations apply bardon-lodge-directors-staging --remote

# Apply to production
npx wrangler d1 migrations apply bardon-lodge-directors-prod --remote
```

## Step 3: Set Up Cloudflare Access

### Create Access Application

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account and the `bardonlodge.co.uk` domain
3. Navigate to **Zero Trust** → **Access** → **Applications**
4. Click **"Add an application"**
5. Choose **"Self-hosted"**

### Configure Staging Application

**Application Configuration:**
- **Application name**: `Bardon Lodge Directors (Staging)`
- **Subdomain**: `staging-directors`
- **Domain**: `bardonlodge.co.uk`
- **Full URL**: `https://staging-directors.bardonlodge.co.uk`

**Application Settings:**
- **Session Duration**: 24 hours
- **Auto Redirect to Identity Provider**: Enabled

**Policies:**
1. Click **"Add a policy"**
2. **Policy name**: `Directors Access - Staging`
3. **Action**: `Allow`
4. **Include**: Add your email addresses (e.g., `you@example.com`)
5. Click **"Save policy"**

### Configure Production Application

**Application Configuration:**
- **Application name**: `Bardon Lodge Directors (Production)`
- **Subdomain**: `directors`  
- **Domain**: `bardonlodge.co.uk`
- **Full URL**: `https://directors.bardonlodge.co.uk`

**Application Settings:**
- **Session Duration**: 24 hours
- **Auto Redirect to Identity Provider**: Enabled

**Policies:**
1. Click **"Add a policy"**
2. **Policy name**: `Directors Access - Production`
3. **Action**: `Allow`
4. **Include**: Add authorized director email addresses
5. Click **"Save policy"**

## Step 4: Configure DNS Records

### Option A: Using Cloudflare Dashboard

1. Go to **DNS** → **Records**
2. Add the following CNAME records:

**Staging Record:**
- **Type**: CNAME
- **Name**: `staging-directors`
- **Target**: `staging-directors.bardonlodge.co.uk.cdn.cloudflare.net`
- **Proxy status**: Proxied (orange cloud)

**Production Record:**
- **Type**: CNAME  
- **Name**: `directors`
- **Target**: `directors.bardonlodge.co.uk.cdn.cloudflare.net`
- **Proxy status**: Proxied (orange cloud)

### Option B: Using Wrangler CLI

```bash
# These will be created automatically when you deploy with custom domains
```

## Step 5: Update Wrangler Configuration

Update your `wrangler.toml` with custom domains:

```toml
name = "directors-worker"
main = "src/index.ts"
compatibility_date = "2024-07-18"

# Default environment (staging)
routes = [
  { pattern = "staging-directors.bardonlodge.co.uk/*", custom_domain = true }
]

[assets]
not_found_handling = "single-page-application"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "bardon-lodge-directors-staging"
database_id = "c174aee0-da86-4d6d-a398-bba3caaebf45"
migrations_dir = "migrations"

# Production environment
[env.production]
name = "directors-worker-prod"
routes = [
  { pattern = "directors.bardonlodge.co.uk/*", custom_domain = true }
]

[[env.production.d1_databases]]
binding = "DB"
database_name = "bardon-lodge-directors-prod"
database_id = "your-production-database-id-here"
migrations_dir = "migrations"

# Staging environment (explicit)
[env.staging]
name = "directors-worker-staging"
routes = [
  { pattern = "staging-directors.bardonlodge.co.uk/*", custom_domain = true }
]

[[env.staging.d1_databases]]
binding = "DB"
database_name = "bardon-lodge-directors-staging"
database_id = "c174aee0-da86-4d6d-a398-bba3caaebf45"
migrations_dir = "migrations"
```

## Step 6: Configure Email Routing

### Set Up Email Routing Rules

1. Go to **Email** → **Email Routing**
2. Enable Email Routing for `bardonlodge.co.uk`
3. Add a catch-all rule or specific rule for `directors@bardonlodge.co.uk`

**For Production:**
- **Expression**: `@bardonlodge.co.uk`
- **Action**: Send to Worker
- **Worker**: `directors-worker-prod`

**For Testing/Staging:**
- You can create a separate subdomain like `staging.bardonlodge.co.uk` for testing
- Or use the same domain but deploy to staging first for testing

## Step 7: Deploy Workers

### Deploy Staging

```bash
# Deploy to staging
npm run build
npx wrangler deploy --env staging

# Or use the npm script
npm run deploy:staging
```

### Deploy Production

```bash
# Deploy to production  
npm run build
npx wrangler deploy --env production

# Or use the npm script
npm run deploy:prod
```

## Step 8: Add Recipients to Database

Add authorized users to both environments:

### Staging Environment

```bash
# Add test recipients to staging
npx wrangler d1 execute bardon-lodge-directors-staging --remote \
  --command="INSERT INTO recipients (email, active) VALUES ('test@example.com', 1);"

npx wrangler d1 execute bardon-lodge-directors-staging --remote \
  --command="INSERT INTO recipients (email, active) VALUES ('staging@example.com', 1);"
```

### Production Environment

```bash
# Add real recipients to production
npx wrangler d1 execute bardon-lodge-directors-prod --remote \
  --command="INSERT INTO recipients (email, active) VALUES ('director1@example.com', 1);"

npx wrangler d1 execute bardon-lodge-directors-prod --remote \
  --command="INSERT INTO recipients (email, active) VALUES ('director2@example.com', 1);"
```

## Step 9: Test the Setup

### Test Staging

1. Navigate to `https://staging-directors.bardonlodge.co.uk`
2. Authenticate through Cloudflare Access
3. Test the recipient management interface
4. Send a test email to verify forwarding (if configured)

### Test Production

1. Navigate to `https://directors.bardonlodge.co.uk`
2. Authenticate through Cloudflare Access  
3. Verify recipient management works
4. Test email forwarding with actual emails

## Step 10: Verify Environment Separation

### Check Database Separation

```bash
# List staging recipients
npx wrangler d1 execute bardon-lodge-directors-staging --remote \
  --command="SELECT * FROM recipients;"

# List production recipients  
npx wrangler d1 execute bardon-lodge-directors-prod --remote \
  --command="SELECT * FROM recipients;"
```

### Check Worker Deployments

```bash
# List all workers
npx wrangler deployments list --name directors-worker-staging
npx wrangler deployments list --name directors-worker-prod
```

## Environment URLs

After setup, your environments will be available at:

- **Staging**: https://staging-directors.bardonlodge.co.uk
- **Production**: https://directors.bardonlodge.co.uk

## Monitoring and Maintenance

### View Logs

```bash
# Staging logs
npx wrangler tail directors-worker-staging

# Production logs  
npx wrangler tail directors-worker-prod
```

### Analytics

1. Go to **Workers & Pages** in Cloudflare Dashboard
2. Select your worker
3. View **Analytics** tab for metrics

### D1 Database Console

1. Go to **Storage & Databases** → **D1**
2. Select your database
3. Use **Console** tab to run SQL queries
4. Use **Metrics** tab to monitor performance

## Security Considerations

1. **Access Policies**: Regularly review who has access to each environment
2. **Database Separation**: Staging and production use completely separate databases
3. **Email Routing**: Ensure production email routing only points to production worker
4. **Environment Variables**: Keep staging and production configurations separate
5. **Monitoring**: Set up alerts for failed deployments or errors

## Troubleshooting

### Common Issues

**"Database not found" errors:**
- Verify database IDs in `wrangler.toml` match what's in Cloudflare dashboard
- Ensure migrations have been applied to the correct environment

**"Access denied" errors:**
- Check Cloudflare Access policies include your email
- Verify the correct subdomain is configured in Access applications

**"Worker not found" errors:**
- Ensure worker has been deployed to the correct environment
- Check that custom domains are properly configured

**Email not forwarding:**
- Verify Email Routing rules point to the correct worker
- Check that recipients exist in the database for the environment
- Review worker logs for forwarding errors

### Getting Help

- **Cloudflare Community**: https://community.cloudflare.com/
- **Wrangler Documentation**: https://developers.cloudflare.com/workers/wrangler/
- **D1 Documentation**: https://developers.cloudflare.com/d1/
- **Access Documentation**: https://developers.cloudflare.com/cloudflare-one/applications/ 