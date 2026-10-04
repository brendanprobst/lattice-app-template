output "name_prefix" {
  description = "Computed slug used in SSM paths."
  value       = local.name_prefix
}

output "ssm_path_prefix" {
  description = "Prefix under which Supabase parameters are stored."
  value       = local.ssm_path_prefix
}

output "supabase_parameter_names" {
  description = "SSM names for app/runtime (values are secret; fetch with IAM)."
  value       = try(module.supabase_ssm[0].parameter_names, null)
}

output "api_lambda_function_name" {
  description = "Lambda function name for the API."
  value       = aws_lambda_function.api.function_name
}

output "api_url" {
  description = "Public HTTP API endpoint URL."
  value       = aws_apigatewayv2_api.api_http.api_endpoint
}

output "web_bucket_name" {
  description = "S3 bucket for static web assets."
  value       = aws_s3_bucket.web.bucket
}

output "web_cloudfront_domain" {
  description = "CloudFront domain serving the web app."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "web_public_base_url" {
  description = "HTTPS URL users should open: custom domain when configured, otherwise the CloudFront default hostname."
  value       = local.web_use_custom_domain ? "https://${trimspace(var.web_custom_domain)}" : "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "web_custom_domain" {
  description = "Custom hostname for the web app, if configured; otherwise null."
  value       = local.web_use_custom_domain ? trimspace(var.web_custom_domain) : null
}

output "manage_web_dns_in_route53" {
  description = "True when Terraform writes ACM validation and the site alias in Route 53."
  value       = local.web_manage_dns_in_route53
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN in us-east-1 when web_custom_domain is set."
  value       = try(aws_acm_certificate.web[0].arn, null)
}

output "acm_certificate_status" {
  description = "ACM certificate status (ISSUED, PENDING_VALIDATION, …). Null when there is no custom domain."
  value       = local.web_acm_status
}

output "acm_validation_record_name" {
  description = "ACM DNS validation CNAME name for this certificate. Create it at the registrar when manage_web_dns_in_route53 is false. Never copy another hostname's _hash."
  value       = try(local.web_acm_validation.name, null)
}

output "acm_validation_record_value" {
  description = "ACM DNS validation CNAME value (acm-validations.aws target) for this certificate."
  value       = try(local.web_acm_validation.value, null)
}

output "route53_hosted_zone_id" {
  description = "Route 53 hosted zone used for the web app DNS (when custom domain is enabled); otherwise null."
  value       = local.web_use_custom_domain ? local.route53_zone_id : null
}

output "route53_zone_name_servers" {
  description = "Nameservers to set at your registrar when create_route53_hosted_zone is true. After delegation propagates, ACM validation and HTTPS can complete."
  value       = var.create_route53_hosted_zone ? aws_route53_zone.web[0].name_servers : null
}

output "web_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation."
  value       = aws_cloudfront_distribution.web.id
}

output "monthly_cost_budget_name" {
  description = "AWS Budget name for monthly cost alerts (if enabled)."
  value       = try(aws_budgets_budget.monthly_cost[0].name, null)
}

output "api_pause_schedule_name" {
  description = "EventBridge Scheduler name for API pause (if enabled)."
  value       = try(aws_scheduler_schedule.api_pause[0].name, null)
}

output "api_resume_schedule_name" {
  description = "EventBridge Scheduler name for API resume (if enabled)."
  value       = try(aws_scheduler_schedule.api_resume[0].name, null)
}
