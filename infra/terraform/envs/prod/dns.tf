locals {
  # Hosted zone for ACM validation + CloudFront alias (when using a custom web hostname).
  route53_zone_id           = var.create_route53_hosted_zone ? aws_route53_zone.web[0].zone_id : var.route53_hosted_zone_id
  web_manage_dns_in_route53 = local.web_use_custom_domain && var.manage_web_dns_in_route53
}

resource "aws_route53_zone" "web" {
  count = var.create_route53_hosted_zone ? 1 : 0
  name  = trimspace(var.route53_zone_name)
}

resource "aws_acm_certificate" "web" {
  provider = aws.us_east_1
  count    = local.web_use_custom_domain ? 1 : 0

  domain_name       = trimspace(var.web_custom_domain)
  validation_method = "DNS"

  lifecycle {
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
