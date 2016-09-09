#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Terminating existing docker containers..."
docker rm -f dynamodb
docker rm -f s3

echo "Starting fake DynamoDB and deploying tables..."
docker run -d -p 7777:7777 --name dynamodb tray/dynamodb-local -inMemory -port 7777
node ${DIR}/setup-db.js http://localhost:7777/

echo "Starting Fake S3 server and deploying buckets..."
docker run -d -p 4569:4569 --name s3 lphoward/fake-s3
node ${DIR}/setup-s3.js http://localhost:4569
