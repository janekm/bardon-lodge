# MX records for Cloudflare Email Routing
resource "cloudflare_dns_record" "mx1" {
  zone_id  = var.cloudflare_zone_id
  name     = "@"
  type     = "MX"
  content  = "route1.mx.cloudflare.net"
  priority = 92
  ttl      = 1
}

resource "cloudflare_dns_record" "mx2" {
  zone_id  = var.cloudflare_zone_id
  name     = "@"
  type     = "MX"
  content  = "route2.mx.cloudflare.net"
  priority = 5
  ttl      = 1
}

resource "cloudflare_dns_record" "mx3" {
  zone_id  = var.cloudflare_zone_id
  name     = "@"
  type     = "MX"
  content  = "route3.mx.cloudflare.net"
  priority = 81
  ttl      = 1
}

# Get Email Routing settings state
resource "cloudflare_email_routing_settings" "main" {
  zone_id = var.cloudflare_zone_id
}

# Rule to forward emails to the worker (deployed via Wrangler)
resource "cloudflare_email_routing_rule" "directors_alias" {
  zone_id = var.cloudflare_zone_id
  name    = "directors-alias-rule"
  enabled = true

  matchers = [
    {
      type  = "literal"
      field = "to"
      value = "directors@${var.cloudflare_zone}"
    }
  ]

  actions = [
    {
      type  = "worker"
      value = ["directors-worker"]  # Worker name from wrangler.toml
    }
  ]

  depends_on = [
    cloudflare_email_routing_settings.main
  ]
}
