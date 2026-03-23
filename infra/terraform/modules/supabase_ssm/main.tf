locals {
  base = trimsuffix(var.ssm_path_prefix, "/")
}

resource "aws_ssm_parameter" "supabase_url" {
  name        = "${local.base}/supabase/url"
  description = "Supabase project URL"
  type        = "String"
  value       = var.supabase_url
  tags        = var.tags
}

resource "aws_ssm_parameter" "supabase_anon_key" {
  name        = "${local.base}/supabase/anon_key"
  description = "Supabase anon (public) key"
  type        = "SecureString"
  value       = var.supabase_anon_key
  tags        = var.tags
}

resource "aws_ssm_parameter" "supabase_service_role_key" {
  name        = "${local.base}/supabase/service_role_key"
  description = "Supabase service_role key (server-only)"
  type        = "SecureString"
  value       = var.supabase_service_role_key
  tags        = var.tags
}

resource "aws_ssm_parameter" "supabase_jwt_secret" {
  count = var.supabase_jwt_secret != null && var.supabase_jwt_secret != "" ? 1 : 0

  name        = "${local.base}/supabase/jwt_secret"
  description = "Supabase JWT secret (optional)"
  type        = "SecureString"
  value       = var.supabase_jwt_secret
  tags        = var.tags
}
