output "role_arn" {
  description = "ARN to store as the repository secret AWS_ROLE_ARN."
  value       = aws_iam_role.this.arn
}

output "role_name" {
  description = "IAM role name."
  value       = aws_iam_role.this.name
}

output "oidc_sub" {
  description = "Trust-policy sub (repo:<owner>/<repo>:*)."
  value       = var.oidc_sub
}

output "oidc_provider_arn" {
  description = "Existing token.actions.githubusercontent.com provider ARN (looked up, not created)."
  value       = data.aws_iam_openid_connect_provider.github.arn
}
