# Defines the Access Application for the Admin API
resource "cloudflare_zero_trust_access_application" "admin_api" {
  account_id = var.cloudflare_account_id
  name       = "Directors Admin API"
  domain     = "api.${var.cloudflare_zone}"
  type       = "self_hosted"
  session_duration = "24h"
}

# Defines the Access Policy for the Admin API
# This policy allows any service token, which is appropriate for a worker API.
resource "cloudflare_zero_trust_access_policy" "authenticated_users" {
  account_id = var.cloudflare_account_id
  name       = "Service Token Users Only"
  decision   = "allow"

  include = [
    {
      any_valid_service_token = {}
    }
  ]
}
