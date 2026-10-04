output "aws_role_arn" {
  description = "Set the repository secret AWS_ROLE_ARN to this value (once, not per GitHub environment)."
  value       = module.gha_deploy_role.role_arn
}

output "aws_role_name" {
  description = "IAM role name managed by this stack."
  value       = module.gha_deploy_role.role_name
}

output "oidc_sub" {
  description = "Trust-policy sub. Confirm this is repo:<owner>/<repo>:* and not a URL."
  value       = module.gha_deploy_role.oidc_sub
}
