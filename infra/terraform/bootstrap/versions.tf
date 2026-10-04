terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state is OK until F5. Do not share this state with envs/dev or envs/prod.
  # backend "s3" {
  #   bucket         = "your-org-terraform-state"
  #   key            = "lattice/bootstrap/gha-deploy-role.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-locks"
  #   encrypt        = true
  # }
}
