terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  # Configure with environment variables:
  # CLOUDFLARE_API_TOKEN
  # CLOUDFLARE_ACCOUNT_ID
}

# Terraform manages only what Wrangler cannot handle:
# - DNS records, Email routing, Access policies
# Workers, D1 databases, and assets are managed by Wrangler
output "message" {
  value = "Terraform configuration is valid."
}
