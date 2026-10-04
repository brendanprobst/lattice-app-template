locals {
  default_tags = merge(
    {
      Project     = var.project_name
      AppSlug     = var.app_slug
      Environment = "bootstrap"
      ManagedBy   = "terraform"
    },
    var.extra_tags,
  )

  role_name = coalesce(var.role_name, "${var.app_slug}-gha")
  oidc_sub  = "repo:${var.github_owner}/${var.github_repo}:*"
}
