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
}
