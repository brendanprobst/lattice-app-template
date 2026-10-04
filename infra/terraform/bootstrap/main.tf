check "oidc_sub_is_repo_wildcard" {
  assert {
    condition = (
      can(regex("^repo:[^/]+/[^/:]+:\\*$", local.oidc_sub)) &&
      !strcontains(lower(local.oidc_sub), "https://")
    )
    error_message = "OIDC sub must be repo:<owner>/<repo>:* and must not contain https://. Do not paste a GitHub URL into github_owner or github_repo."
  }
}

module "gha_deploy_role" {
  source = "../modules/gha-deploy-role"

  role_name      = local.role_name
  oidc_sub       = local.oidc_sub
  aws_account_id = var.aws_account_id
  aws_region     = var.aws_region
  project_name   = var.project_name
  tags           = local.default_tags
}
