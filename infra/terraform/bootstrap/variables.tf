variable "aws_region" {
  description = "AWS region used in Lambda ARNs. Must match envs/dev and envs/prod."
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "12-digit account that already has token.actions.githubusercontent.com."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be a 12-digit AWS account id."
  }
}

variable "app_slug" {
  description = "Spawn slug (same as .lattice/infisical.json appSlug). Default role name is <app_slug>-gha."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]+(?:-[a-z0-9]+)*$", var.app_slug))
    error_message = "app_slug must be lowercase kebab-case."
  }
}

variable "github_owner" {
  description = "GitHub org or user login only — not a URL and not owner/repo."
  type        = string

  validation {
    condition = (
      !strcontains(lower(var.github_owner), "https://") &&
      !strcontains(var.github_owner, "/") &&
      !strcontains(var.github_owner, ":") &&
      can(regex("^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$", var.github_owner))
    )
    error_message = "github_owner must be the GitHub org or user login, not a URL."
  }
}

variable "github_repo" {
  description = "Repository name only (not owner/repo and not a GitHub URL)."
  type        = string

  validation {
    condition = (
      !strcontains(lower(var.github_repo), "https://") &&
      !strcontains(var.github_repo, "/") &&
      !strcontains(var.github_repo, ":") &&
      can(regex("^[A-Za-z0-9._-]+$", var.github_repo))
    )
    error_message = "github_repo must be the repository name only, not a URL or owner/repo."
  }
}

variable "project_name" {
  description = "Same project_name as infra/terraform/envs/dev (and prod). Used for <project>-dev-web / -prod-web and <project>-dev-api / -prod-api ARNs."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]+(?:-[a-z0-9]+)*$", var.project_name))
    error_message = "project_name must be lowercase kebab-case."
  }
}

variable "role_name" {
  description = "Override IAM role name. Leave null for <app_slug>-gha. Set this when importing a console-created role such as lattice-smoke-test-gha-arn."
  type        = string
  default     = null
  nullable    = true
}

variable "extra_tags" {
  description = "Additional tags merged into defaults."
  type        = map(string)
  default     = {}
}
