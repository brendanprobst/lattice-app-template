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
