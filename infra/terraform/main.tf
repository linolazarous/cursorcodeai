# infra/terraform/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "\~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "\~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "\~> 2.0"
    }
  }

  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.aws_region
}

# =============================================
# VPC (Using official AWS module)
# =============================================
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.18.1"

  name = "cursorcode-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["\( {var.aws_region}a", " \){var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Environment = "production"
    Project     = "cursorcode-ai"
  }
}

# =============================================
# EKS Cluster (Full production setup)
# =============================================
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.33.1"

  cluster_name    = "cursorcode-cluster"
  cluster_version = "1.31"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  control_plane_subnet_ids       = module.vpc.public_subnets

  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true

  # Security
  cluster_security_group_additional_rules = {
    ingress_nodes = {
      description = "Allow nodes to communicate with control plane"
      protocol    = "tcp"
      from_port   = 443
      to_port     = 443
      type        = "ingress"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  # Managed Node Groups
  eks_managed_node_groups = {
    general = {
      min_size       = 2
      max_size       = 8
      desired_size   = 3
      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"

      labels = {
        role = "general"
      }

      tags = {
        Environment = "production"
      }
    }

    compute = {
      min_size       = 1
      max_size       = 6
      desired_size   = 2
      instance_types = ["c6i.2xlarge"]
      capacity_type  = "ON_DEMAND"

      labels = {
        role = "compute"
      }
    }
  }

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  tags = {
    Environment = "production"
    Project     = "cursorcode-ai"
  }
}

# =============================================
# Outputs
# =============================================
output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_security_group_id" {
  value = module.eks.cluster_security_group_id
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
