module "supabase_ssm" {
  count  = var.manage_supabase_credentials_in_ssm ? 1 : 0
  source = "../../modules/supabase_ssm"

  tags            = local.default_tags
  ssm_path_prefix = local.ssm_path_prefix

  supabase_url                = var.supabase_url
  supabase_anon_key           = var.supabase_anon_key
  supabase_service_role_key   = var.supabase_service_role_key
  supabase_jwt_secret         = var.supabase_jwt_secret
}
