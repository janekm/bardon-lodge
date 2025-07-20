# Infrastructure Management

This directory contains Terraform configuration for managing Cloudflare resources that Wrangler cannot handle.

## Separation of Responsibilities

### 🚀 **Wrangler Handles:**

- Worker scripts and deployment (`wrangler deploy`)
- Static assets serving (SPA files in `spa/dist/`)
- D1 databases and migrations (`wrangler d1 create`, `wrangler d1 migrations apply`)
- Bindings (D1, assets, etc.)
- Single-page application routing

### 🏗️ **Terraform Handles:**

- DNS records (MX records for email routing)
- Email routing settings and rules
- Zero Trust Access applications and policies

## Usage

1. **Deploy infrastructure** (DNS, email routing, Access):

   ```bash
   cd infrastructure
   terraform init
   terraform plan
   terraform apply
   ```

2. **Deploy application** (handled by Wrangler):
   ```bash
   cd ..
   npm run build          # Build SPA assets
   npm run deploy:staging # Deploy worker with assets
   ```

## Architecture Overview

The system now uses a single Cloudflare Worker that:

- Serves the React SPA for navigation requests
- Handles API requests on `/api/*` routes
- Integrates email forwarding functionality
- Provides unified authentication and routing

## Resource Summary

| Resource           | Count | Purpose                       |
| ------------------ | ----- | ----------------------------- |
| DNS Records        | 3     | MX records for email routing  |
| Email Routing      | 2     | Settings and forwarding rules |
| Access Application | 1     | Zero Trust authentication     |
| Access Policy      | 1     | Authorization rules           |

**Total: 7 Terraform-managed resources**

## Files

- `main.tf` - Provider configuration and outputs
- `dns.tf` - DNS records and email routing configuration
- `access.tf` - Cloudflare Access security setup
- `variables.tf` - Input variables for configuration

## Environment Variables

Required for Terraform:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with appropriate permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

Set via CLI:

```bash
terraform apply -var="cloudflare_account_id=your-account-id" -var="cloudflare_zone_id=your-zone-id"
```
