check "not_reserved_apex" {
  assert {
    condition     = var.allow_reserved_apex || !contains(local.reserved_apexes, local.zone_name)
    error_message = "zone_name must be this app's island (e.g. lattice.brendanprobst.com), not the reserved apex brendanprobst.com or fosterfolio.com. Set allow_reserved_apex only if this spawn already owns that domain. Do not apply this stack against Fosterfolio's fosterfolio.com zone (Z086583512U74ZET8C9T8)."
  }
}

resource "aws_route53_zone" "this" {
  name    = local.zone_name
  comment = "Lattice spawn ${var.app_slug} island (not envs/dev or envs/prod state)"

  tags = local.default_tags

  lifecycle {
    precondition {
      condition     = var.allow_reserved_apex || !contains(local.reserved_apexes, local.zone_name)
      error_message = "Refusing reserved apex zone_name. Use a child island or allow_reserved_apex. Do not apply against fosterfolio.com."
    }
  }
}
