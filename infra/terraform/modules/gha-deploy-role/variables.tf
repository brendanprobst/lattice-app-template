variable "role_name" {
  description = "IAM role name. Default in the bootstrap root is <app_slug>-gha. Override when importing an existing console-created role (e.g. lattice-smoke-test-gha-arn)."
  type        = string

  validation {
    condition     = can(regex("^[\\w+=,.@-]{1,64}$", var.role_name))
    error_message = "role_name must be a valid IAM role name (1–64 characters: letters, digits, and +=,.@-)."
  }
}

variable "oidc_sub" {
  description = "GitHub OIDC token.actions.githubusercontent.com:sub value. Must be repo:<owner>/<repo>:* — never a GitHub URL."
  type        = string

  validation {
    condition = (
      can(regex("^repo:[^/]+/[^/:]+:\\*$", var.oidc_sub)) &&
      !strcontains(lower(var.oidc_sub), "https://")
    )
    error_message = "oidc_sub must match repo:<owner>/<repo>:* and must not contain https://."
  }
}

variable "aws_account_id" {
  description = "12-digit account that already has token.actions.githubusercontent.com. Must match the credentials used to plan/apply."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be a 12-digit AWS account id."
  }
}

variable "aws_region" {
  description = "Region used in Lambda function ARNs (must match envs/dev and envs/prod)."
  type        = string
}

variable "project_name" {
  description = "Terraform project_name from the app stacks. Permissions are limited to <project>-dev-* and <project>-prod-*."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]+(?:-[a-z0-9]+)*$", var.project_name))
    error_message = "project_name must be lowercase kebab-case (same string as envs/dev terraform.tfvars)."
  }
}

variable "tags" {
  description = "Tags applied to the role."
  type        = map(string)
  default     = {}
}
