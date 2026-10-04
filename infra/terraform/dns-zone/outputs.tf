output "route53_hosted_zone_id" {
  description = "Set this same id on both envs/dev and envs/prod. create_route53_hosted_zone must stay false there."
  value       = aws_route53_zone.this.zone_id
}

output "name_servers" {
  description = "Delegate this child at the parent registrar (NS for this name only — do not change the parent apex nameservers)."
  value       = aws_route53_zone.this.name_servers
}

output "zone_name" {
  description = "Normalized public zone name (no trailing dot)."
  value       = local.zone_name
}
