variable "aws_region" {
  description = "AWS region for the provider. Route 53 hosted zones are global."
  type        = string
  default     = "us-east-1"
}

variable "app_slug" {
  description = "Spawn slug (same as .lattice/infisical.json appSlug). Used in tags."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]+(?:-[a-z0-9]+)*$", var.app_slug))
    error_message = "app_slug must be lowercase kebab-case."
  }
}

variable "project_name" {
  description = "Same project_name as infra/terraform/envs/dev (and prod). Used in tags."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]+(?:-[a-z0-9]+)*$", var.project_name))
    error_message = "project_name must be lowercase kebab-case."
  }
}

variable "zone_name" {
  description = <<-EOT
    FQDN of this spawn's DNS island (e.g. lattice.brendanprobst.com), not the
    parent personal apex. Hosts the apex and env hostnames under that name.
    Do not set brendanprobst.com or fosterfolio.com unless allow_reserved_apex
    is true — and never apply this stack against Fosterfolio's fosterfolio.com zone.
  EOT
  type        = string

  validation {
    condition = can(regex(
      "^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$",
      trimsuffix(lower(trimspace(var.zone_name)), "."),
    ))
    error_message = "zone_name must be a lowercase FQDN with at least one dot (this app's island, not a bare label)."
  }
}

variable "allow_reserved_apex" {
  description = <<-EOT
    Override the reserved-apex refuse for brendanprobst.com / fosterfolio.com.
    Use only when this spawn already owns that domain. Do not use this to put
    the personal site into AWS or to create a second fosterfolio.com zone
    (leave Z086583512U74ZET8C9T8 as Fosterfolio prod).
  EOT
  type        = bool
  default     = false
}

variable "extra_tags" {
  description = "Additional tags merged into defaults."
  type        = map(string)
  default     = {}
}
