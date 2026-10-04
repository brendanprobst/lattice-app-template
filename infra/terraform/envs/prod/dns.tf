locals {
  # Hosted zone for ACM validation + CloudFront alias (when using a custom web hostname).
  route53_zone_id           = var.create_route53_hosted_zone ? aws_route53_zone.web[0].zone_id : var.route53_hosted_zone_id
  web_manage_dns_in_route53 = local.web_use_custom_domain && var.manage_web_dns_in_route53

  # Splats stay null when no cert exists (web_custom_domain unset).
  web_acm_status = one(aws_acm_certificate.web[*].status)
  web_acm_issued = local.web_acm_status == "ISSUED"
  web_acm_validation = one([
    for dvo in flatten(aws_acm_certificate.web[*].domain_validation_options) : {
      name  = dvo.resource_record_name
      value = dvo.resource_record_value
    }
  ])
  web_acm_validation_name  = try(local.web_acm_validation.name, "<terraform output acm_validation_record_name>")
  web_acm_validation_value = try(local.web_acm_validation.value, "<terraform output acm_validation_record_value>")
  web_acm_not_issued_error = <<-EOT
ACM certificate for ${local.web_use_custom_domain ? trimspace(var.web_custom_domain) : "(none)"} is ${coalesce(local.web_acm_status, "unknown")}, not ISSUED.
CloudFront will not attach this hostname or certificate until ACM status is ISSUED (avoids InvalidViewerCertificate).

Add this certificate's validation CNAME at the registrar. Never copy another hostname's _hash onto this name.

  Name   ${local.web_acm_validation_name}
  Type   CNAME
  Value  ${local.web_acm_validation_value}

Also CNAME the site hostname to CloudFront (terraform output web_cloudfront_domain).

  dig +short CNAME ${local.web_use_custom_domain ? trimspace(var.web_custom_domain) : "example.com"}
  dig +short CNAME '${local.web_acm_validation_name}'

After public DNS shows the acm-validations.aws target and ACM is Issued, re-run terraform apply.
EOT
}

resource "aws_route53_zone" "web" {
  count = var.create_route53_hosted_zone ? 1 : 0
  name  = trimspace(var.route53_zone_name)

  lifecycle {
    precondition {
      condition     = var.allow_create_route53_hosted_zone_in_env
      error_message = "create_route53_hosted_zone = true in an env stack creates a second zone. Use infra/terraform/dns-zone (path D) or set allow_create_route53_hosted_zone_in_env = true for legacy path A."
    }
  }
}

resource "aws_acm_certificate" "web" {
  provider = aws.us_east_1
  count    = local.web_use_custom_domain ? 1 : 0

  domain_name       = trimspace(var.web_custom_domain)
  validation_method = "DNS"

  lifecycle {
    # Replacement creates the new cert first. The in-use cert is not destroyed
    # until CloudFront has switched (blocked while the new cert is not ISSUED).
    create_before_destroy = true
  }
}

resource "aws_route53_record" "web_cert_validation" {
  for_each = local.web_manage_dns_in_route53 ? {
    for dvo in aws_acm_certificate.web[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = local.route53_zone_id
}

resource "aws_acm_certificate_validation" "web" {
  provider = aws.us_east_1
  count    = local.web_manage_dns_in_route53 ? 1 : 0

  certificate_arn         = aws_acm_certificate.web[0].arn
  validation_record_fqdns = [for r in aws_route53_record.web_cert_validation : r.fqdn]
}

resource "aws_route53_record" "web_alias" {
  count = local.web_manage_dns_in_route53 ? 1 : 0

  zone_id = local.route53_zone_id
  name    = trimspace(var.web_custom_domain)
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = aws_cloudfront_distribution.web.hosted_zone_id
    evaluate_target_health = false
  }
}
