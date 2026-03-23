output "parameter_names" {
  description = "SSM parameter names (read values at runtime with IAM-restricted access)."
  value = {
    url              = aws_ssm_parameter.supabase_url.name
    anon_key         = aws_ssm_parameter.supabase_anon_key.name
    service_role_key = aws_ssm_parameter.supabase_service_role_key.name
    jwt_secret       = try(aws_ssm_parameter.supabase_jwt_secret[0].name, null)
  }
}
