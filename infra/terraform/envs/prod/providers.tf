provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.default_tags
  }
}


# CloudFront TLS certificates must be issued in us-east-1 (Virginia), regardless of where other resources run.
provider "aws" {
  alias = "us_east_1"

  region = "us-east-1"

  default_tags {
    tags = local.default_tags
  }
}
