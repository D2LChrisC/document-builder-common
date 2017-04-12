#!/usr/bin/env bash

cd "$(dirname "$0")"

echo "Creating application version package..."

# set AWS credentials
echo "Setting AWS credentials..."
aws configure set aws_access_key_id $2
aws configure set aws_secret_access_key $3
aws configure set default.region us-east-1
aws configure set s3.signature_version s3v4

# log into ECR
echo "Logging into AWS ECR..."
$(aws ecr get-login --region us-east-1)

# tag and publish our latest stable build
echo "Tagging and pushing docker image..."
docker tag docbuilder/$4:latest $1.dkr.ecr.us-east-1.amazonaws.com/docbuilder/$4:latest
docker push $1.dkr.ecr.us-east-1.amazonaws.com/docbuilder/$4:latest

echo "Getting Terraform assets from S3..."
# Package and upload the application versions for ElasticBeanstalk.
mkdir temp && cd temp/
cp -r ../service/. ./
sed -i -e s/aws_account/$1/g Dockerrun.aws.json
zip -rv ../terraform/service.zip .ebextensions/ Dockerrun.aws.json
rm -rf ./*

cp -r ../worker/. ./
sed -i -e s/aws_account/$1/g Dockerrun.aws.json
zip -rv ../terraform/worker.zip .ebextensions/ Dockerrun.aws.json
cd .. && rm -rf temp/

aws s3 cp ./terraform/service.zip s3://d2l-docbuilder-terraform-$1/service.zip --sse aws:kms --sse-kms-key-id $5
aws s3 cp ./terraform/worker.zip s3://d2l-docbuilder-terraform-$1/worker.zip --sse aws:kms --sse-kms-key-id $5

# Pull down the state files to perform the conversion.
aws s3 sync s3://d2l-docbuilder-terraform-$1 ./terraform
unzip ./terraform/terraform.zip -d ./terraform

echo "Deploying environments..."
cd terraform
for d in */ ; do
	cd $d
	../terraform apply
	cd ..
done

echo "Saving state changes back to S3..."
rm terraform
cd ..
aws s3 sync ./terraform s3://d2l-docbuilder-terraform-$1 --sse aws:kms --sse-kms-key-id $5
