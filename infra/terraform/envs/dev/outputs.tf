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
