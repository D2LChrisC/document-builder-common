variable "access_key" {}
variable "secret_key" {}
variable "region" {}

variable "aws_account_id" {
  default = "893751385159"
}

variable "env" {
  default = "prod"
}

variable "service_solution_stack" {
  default = "64bit Amazon Linux 2016.09 v2.5.2 running Docker 1.12.6"
}

variable "worker_solution_stack" {
  default = "64bit Amazon Linux 2016.09 v2.5.2 running Docker 1.12.6"
}

variable "notification_email" {
  default = "chris.carleton@d2l.com"
}

variable "ssh_public_key" {}

variable "auth_service" {
  default = "https://auth.brightspace.com/core"
}
variable "logstash_host" {
  default = "logging.dcs.brightspace.com"
}
variable "logstash_port" {
  default = "24000"
}

provider "aws" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region     = "${var.region}"
}

# Import the TLS server certificate for the server load balancer
data "aws_iam_server_certificate" "star-brightspace-com" {
  name = "star-dcs-brightspace-com"
}

data "aws_caller_identity" "current" { }

data "aws_s3_bucket_object" "service-bundle" {
  bucket = "elasticbeanstalk-${var.region}-${var.aws_account_id}"
  key = "service.zip"
}

data "aws_s3_bucket_object" "worker-bundle" {
  bucket = "elasticbeanstalk-${var.region}-${var.aws_account_id}"
  key = "worker.zip"
}

resource "aws_kms_key" "file-store-kms-key" {
  description = "Key used to encrypt files at rest in S3 buckets."
}

resource "aws_kms_alias" "file-store-kms-alias" {
  name = "alias/file-store-key-${var.region}-${var.env}"
  target_key_id = "${aws_kms_key.file-store-kms-key.key_id}"
}

resource "aws_dynamodb_table" "conversions-table" {
    name = "DocBuilder-Conversions"
    read_capacity = 3
    write_capacity = 5
    hash_key = "fileId"
    range_key = "format"
    attribute {
      name = "fileId"
      type = "S"
    }
    attribute {
      name = "format"
      type = "S"
    }
}

resource "aws_dynamodb_table" "files-table" {
    name = "DocBuilder-Files"
    read_capacity = 3
    write_capacity = 5
    hash_key = "checksum"
    range_key = "format"
    attribute {
      name = "checksum"
      type = "S"
    }
    attribute {
      name = "format"
      type = "S"
    }
}

resource "aws_sqs_queue" "dead-letter-queue" {
  name = "Conversions-Dead-Letter"
}

resource "aws_sqs_queue" "conversion-queue" {
  name = "Conversion-Request-Queue"
  redrive_policy = "{\"deadLetterTargetArn\":\"${aws_sqs_queue.dead-letter-queue.arn}\",\"maxReceiveCount\":1000}"
}

resource "aws_s3_bucket" "unconverted-bucket" {
    bucket = "d2l-docbuilder-${var.env}-${var.region}-unconverted"
    acl = "private"

    lifecycle_rule {
      id = "expire_files"
      prefix = ""
      enabled = true
      expiration {
        days = 10
      }
    }
}

resource "aws_s3_bucket" "converted-bucket" {
    bucket = "d2l-docbuilder-${var.env}-${var.region}-converted"
    acl = "private"

    lifecycle_rule {
      id = "expire_files"
      prefix = ""
      enabled = true
      expiration {
        days = 180
      }
    }

    cors_rule {
      allowed_origins = ["*"]
      allowed_methods = ["GET"]
      allowed_headers = ["Authorization"]
      max_age_seconds = 3000
    }
}

resource "aws_s3_bucket_notification" "queue-for-conversion" {
    bucket = "${aws_s3_bucket.unconverted-bucket.id}"
    queue {
        queue_arn = "${aws_sqs_queue.conversion-queue.arn}"
        events = ["s3:ObjectCreated:*"]
    }
}

# Enforce encryption on files uploaded to S3 buckets...
resource "aws_s3_bucket_policy" "enforce-encryption-unconverted" {
  bucket = "${aws_s3_bucket.unconverted-bucket.id}"
  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Id": "PutObjPolicy",
  "Statement": [
    {
      "Sid": "DenyIncorrectEncryptionHeader",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "${aws_s3_bucket.unconverted-bucket.arn}/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "DenyUnEncryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "${aws_s3_bucket.unconverted-bucket.arn}/*",
      "Condition": {
        "Null": {
          "s3:x-amz-server-side-encryption": "true"
        }
      }
    }
  ]
}
POLICY
}

resource "aws_s3_bucket_policy" "enforce-encryption-converted" {
  bucket = "${aws_s3_bucket.converted-bucket.id}"
  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Id": "PutObjPolicy",
  "Statement": [
    {
      "Sid": "DenyIncorrectEncryptionHeader",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "${aws_s3_bucket.converted-bucket.arn}/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "DenyUnEncryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "${aws_s3_bucket.converted-bucket.arn}/*",
      "Condition": {
        "Null": {
          "s3:x-amz-server-side-encryption": "true"
        }
      }
    }
  ]
}
POLICY
}

resource "aws_sqs_queue_policy" "allow-writes-from-s3" {
  queue_url = "${aws_sqs_queue.conversion-queue.id}"
  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Id": "allow-writes-from-s3",
  "Statement": [
    {
      "Sid": "First",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "sqs:SendMessage",
      "Resource": "${aws_sqs_queue.conversion-queue.arn}",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "${aws_s3_bucket.unconverted-bucket.arn}"
        }
      }
    }
  ]
}
POLICY
}

resource "aws_elastic_beanstalk_application" "doc-builder" {
  name = "Document Builder"
  description = "A handy document conversion service by D2L"
}

resource "aws_key_pair" "ssh-key-pair" {
  key_name = "d2l-ssh-key"
  public_key = "${var.ssh_public_key}"
}

resource "aws_elastic_beanstalk_application_version" "service-app-version" {
  name = "service-bundle-${var.env}"
  application = "${aws_elastic_beanstalk_application.doc-builder.name}"
  bucket = "elasticbeanstalk-${var.region}-${var.aws_account_id}"
  key = "service.zip"
}

resource "aws_elastic_beanstalk_application_version" "worker-app-version" {
  name = "worker-bundle-${var.env}"
  application = "${aws_elastic_beanstalk_application.doc-builder.name}"
  bucket = "elasticbeanstalk-${var.region}-${var.aws_account_id}"
  key = "worker.zip"
}

resource "aws_elastic_beanstalk_environment" "doc-builder-service" {
  name = "docbuilder-service-${var.env}"
  tier = "WebServer"
  application = "${aws_elastic_beanstalk_application.doc-builder.name}"
  version_label = "${aws_elastic_beanstalk_application_version.service-app-version.name}"
  solution_stack_name = "${var.service_solution_stack}"
  wait_for_ready_timeout = "20m"

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "SSHSourceRestriction"
    value = "tcp, 22, 22, 216.16.228.6/32"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name = "BatchSize"
    value = "30"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name = "BatchSizeType"
    value = "Percentage"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name = "DeploymentPolicy"
    value = "RollingWithAdditionalBatch"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sns:topics"
    name = "Notification Endpoint"
    value = "${var.notification_email}"
  }

  setting {
    namespace = "aws:elb:policies"
    name = "ConnectionDrainingEnabled"
    value = "true"
  }

  setting {
    namespace = "aws:elb:policies"
    name = "ConnectionDrainingTimeout"
    value = "20"
  }

  setting {
    namespace = "aws:elb:healthcheck"
    name = "Interval"
    value = "300"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_ENCRYPTION_KEY_ID"
    value = "${aws_kms_key.file-store-kms-key.key_id}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_AUTH_SERVICE"
    value = "${var.auth_service}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_PROTOCOL"
    value = "http"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_DATABASE"
    value = "aws-dynamodb"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_LOGSTASH_HOST"
    value = "${var.logstash_host}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_LOGSTASH_PORT"
    value = "${var.logstash_port}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_DATABASE_KEYID"
    value = "${var.access_key}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_DATABASE_SECRET"
    value = "${var.secret_key}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_AWS_REGION"
    value = "${var.region}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_UNCONVERTED_BUCKET"
    value = "${aws_s3_bucket.unconverted-bucket.id}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_CONVERTED_BUCKET"
    value = "${aws_s3_bucket.converted-bucket.id}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_FILE_STORAGE"
    value = "aws-s3"
  }

  setting {
    namespace = "aws:elb:loadbalancer"
    name = "LoadBalancerHTTPSPort"
    value = "443"
  }

  setting {
    namespace = "aws:elb:loadbalancer"
    name = "CrossZone"
    value = "true"
  }

  setting {
    namespace = "aws:elb:loadbalancer"
    name = "LoadBalancerHTTPPort"
    value = "OFF"
  }

  setting {
    namespace = "aws:elb:loadbalancer"
    name = "SSLCertificateId"
    value = "${data.aws_iam_server_certificate.star-brightspace-com.arn}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name = "ServiceRole"
    value = "aws-elasticbeanstalk-service-role"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name = "EnvironmentType"
    value = "LoadBalanced"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application"
    name = "Application Healthcheck URL"
    value = "/api/1.0/health"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "UpperThreshold"
    value = "10000000"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "BreachDuration"
    value = "4"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "MeasureName"
    value = "NetworkIn"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "Period"
    value = "3"
  }

  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name = "SystemType"
    value = "enhanced"
  }

  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name = "HealthCheckSuccessThreshold"
    value = "Ok"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "IamInstanceProfile"
    value = "aws-elasticbeanstalk-ec2-role"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "InstanceType"
    value = "t2.micro"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "EC2KeyName"
    value = "${aws_key_pair.ssh-key-pair.key_name}"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "RootVolumeType"
    value = "gp2"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name = "RollingUpdateType"
    value = "Health"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name = "RollingUpdateEnabled"
    value = "true"
  }
}

resource "aws_elastic_beanstalk_environment" "doc-builder-worker" {
  name = "docbuilder-worker-${var.env}"
  tier = "Worker"
  application = "${aws_elastic_beanstalk_application.doc-builder.name}"
  version_label = "${aws_elastic_beanstalk_application_version.worker-app-version.name}"
  solution_stack_name = "${var.worker_solution_stack}"
  wait_for_ready_timeout = "20m"

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "SSHSourceRestriction"
    value = "tcp, 22, 22, 216.16.228.6/32"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name = "BatchSize"
    value = "35"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name = "BatchSizeType"
    value = "Percentage"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name = "DeploymentPolicy"
    value = "RollingWithAdditionalBatch"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sns:topics"
    name = "Notification Endpoint"
    value = "${var.notification_email}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_ENCRYPTION_KEY_ID"
    value = "${aws_kms_key.file-store-kms-key.key_id}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_ACCESS_KEY_ID"
    value = "${var.access_key}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_AWS_SECRET_KEY"
    value = "${var.secret_key}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_DATABASE"
    value = "aws-dynamodb"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_LOGSTASH_HOST"
    value = "${var.logstash_host}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_LOGSTASH_PORT"
    value = "${var.logstash_port}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_UNCONVERTED_BUCKET"
    value = "${aws_s3_bucket.unconverted-bucket.id}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_CONVERTED_BUCKET"
    value = "${aws_s3_bucket.converted-bucket.id}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_FILE_STORAGE"
    value = "aws-s3"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_AWS_REGION"
    value = "${var.region}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name = "DOCBUILDER_CONVERSION_TIMEOUT"
    value = "1700000"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name = "ConnectTimeout"
    value = "60"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name = "ErrorVisibilityTimeout"
    value = "2"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name = "HttpPath"
    value = "/api/1.0/convert/"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name = "WorkerQueueURL"
    value = "${aws_sqs_queue.conversion-queue.id}"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name = "VisibilityTimeout"
    value = "1800"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name = "HttpConnections"
    value = "1"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name = "InactivityTimeout"
    value = "1800"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name = "VisibilityTimeout"
    value = "1800"
  }

  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name = "MimeType"
    value = "application/json"
  }

  setting {
    namespace = "aws:elasticbeanstalk:monitoring"
    name = "Automatically Terminate Unhealthy Instances"
    value = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name = "ServiceRole"
    value = "aws-elasticbeanstalk-service-role"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name = "EnvironmentType"
    value = "LoadBalanced"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application"
    name = "Application Healthcheck URL"
    value = "/api/1.0/health"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "LowerBreachScaleIncrement"
    value = "-1"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "UpperBreachScaleIncrement"
    value = "10%"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "BreachDuration"
    value = "6"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "LowerThreshold"
    value = "7"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "MeasureName"
    value = "CPUUtilization"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "UpperThreshold"
    value = "28"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name = "Unit"
    value = "Percent"
  }

  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name = "SystemType"
    value = "enhanced"
  }

  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name = "HealthCheckSuccessThreshold"
    value = "Ok"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "IamInstanceProfile"
    value = "aws-elasticbeanstalk-ec2-role"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "InstanceType"
    value = "c4.large"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "EC2KeyName"
    value = "${aws_key_pair.ssh-key-pair.key_name}"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name = "RootVolumeType"
    value = "gp2"
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name = "MinSize"
    value = "2"
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name = "MaxSize"
    value = "20"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name = "MinInstancesInService"
    value = "1"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name = "RollingUpdateType"
    value = "Health"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name = "MaxBatchSize"
    value = "5"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name = "RollingUpdateEnabled"
    value = "true"
  }
}
