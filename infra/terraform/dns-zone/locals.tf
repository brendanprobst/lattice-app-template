locals {
  zone_name = trimsuffix(lower(trimspace(var.zone_name)), ".")
  reserved_apexes = toset([
    "brendanprobst.com",
    "fosterfolio.com",
  ])

  default_tags = merge(
    {
      Project     = var.project_name
      AppSlug     = var.app_slug
      Environment = "dns-zone"
      ManagedBy   = "terraform"
    },
    var.extra_tags,
  )
}
