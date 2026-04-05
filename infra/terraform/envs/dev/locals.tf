locals {
  default_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.extra_tags,
  )

  name_prefix     = lower(replace("${var.project_name}-${var.environment}", " ", "-"))
  ssm_path_prefix = "/${local.name_prefix}"

  # Custom web hostname (Route 53 + ACM + CloudFront alias). Null keeps the default *.cloudfront.net URL only.
  web_use_custom_domain = var.web_custom_domain != null && trimspace(var.web_custom_domain) != ""
}

