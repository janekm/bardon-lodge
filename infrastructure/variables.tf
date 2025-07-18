variable "cloudflare_account_id" {
  type        = string
  description = "The Cloudflare account ID."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "The Cloudflare zone ID for bardonlodge.co.uk."
}

variable "cloudflare_zone" {
  type        = string
  description = "The domain name of the Cloudflare zone."
  default     = "bardonlodge.co.uk"
}
