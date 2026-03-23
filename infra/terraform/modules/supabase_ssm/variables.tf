variable "tags" {
  description = "Tags applied to SSM parameters."
  type        = map(string)
}

variable "ssm_path_prefix" {
  description = "Leading path segment for parameters, e.g. /myapp/dev."
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL (https://xxx.supabase.co)."
  type        = string
}

variable "supabase_anon_key" {
  description = "Supabase anon (public) key."
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key" {
  description = "Supabase service_role key (server-only; never expose to browsers)."
  type        = string
  sensitive   = true
}

variable "supabase_jwt_secret" {
  description = "Optional JWT secret from Supabase project settings (for custom JWT verification)."
  type        = string
  sensitive   = true
  default     = null
}
