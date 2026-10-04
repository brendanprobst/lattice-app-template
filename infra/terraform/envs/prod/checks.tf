# Cross-variable rules for optional custom web hostname + Route 53 (Terraform 1.5+).

check "web_custom_domain_route53" {
  assert {
    condition = (
      var.web_custom_domain == null ||
      trimspace(var.web_custom_domain) == "" ||
      !var.manage_web_dns_in_route53 ||
      (
        var.create_route53_hosted_zone ? (
          var.route53_zone_name != null && trimspace(var.route53_zone_name) != ""
          ) : (
          var.route53_hosted_zone_id != null && trimspace(var.route53_hosted_zone_id) != ""
        )
      )
    )
    error_message = "When web_custom_domain is set, either create_route53_hosted_zone with route53_zone_name, or route53_hosted_zone_id (without creating a zone), must be set. Lattice default is path D: create the zone in infra/terraform/dns-zone, then set create_route53_hosted_zone = false and the same route53_hosted_zone_id on both envs."
  }
}

check "no_second_hosted_zone_in_env_stack" {
  assert {
    condition     = !var.create_route53_hosted_zone || var.allow_create_route53_hosted_zone_in_env
    error_message = "create_route53_hosted_zone = true in an env stack creates a second zone (Fosterfolio-dev footgun). Use infra/terraform/dns-zone and set create_route53_hosted_zone = false plus route53_hosted_zone_id on both envs. Path A requires allow_create_route53_hosted_zone_in_env = true."
  }
}

check "route53_create_not_with_existing_zone_id" {
  assert {
    condition = !(
      var.create_route53_hosted_zone &&
      var.route53_hosted_zone_id != null &&
      trimspace(var.route53_hosted_zone_id) != ""
    )
    error_message = "Do not set both create_route53_hosted_zone and route53_hosted_zone_id; use create + route53_zone_name, or an existing route53_hosted_zone_id."
  }
}
