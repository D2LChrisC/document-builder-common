'use strict';

var aws = require('aws-sdk');
var Promise = require('bluebird');

if(process.argv.length === 2) {
	console.log('Usage:\nnode setup-s3.js AWS_KEY_ID AWS_SECRET_KEY [AWS_REGION]');
	console.log('\tIf AWS_REGION is omitted the default will be us-east-1.\n\n- or -\n');
	console.log('node setup-s3.js END_POINT');
	console.log('Use END_POINT to set up a local instance of the database.');
	return;
}

var s3Config = {
	env: 'dev',
	accessKeyId: 'USWUXHGYZQYFYFFIT3RE',
	secretAccessKey: 'MOJRH0mkL1IPauahWITSVvyDrQbEEIwljvmxdq03',
	signatureVersion: 'v4',
	region: 'us-west-1'
};

if(process.argv.length === 3) {
	s3Config.s3ForcePathStyle = true;
	s3Config.endpoint = new aws.Endpoint(process.argv[2]);
} else {
	s3Config.accessKeyId = process.argv[2];
	s3Config.secretAccessKey = process.argv[3];

	if(process.argv.length >= 5) {
		s3Config.region = process.argv[4];
	}
}

console.log('Access Key ID:\t\t' + s3Config.accessKeyId);
console.log('Secret Access Key:\t' + s3Config.secretAccessKey);
console.log('Region:\t\t\t' + s3Config.region);
console.log('End point:\t\t' + s3Config.endpoint);

aws.config.update(s3Config);

var s3 = Promise.promisifyAll(new aws.S3({ apiVersion: '2006-03-01' }));

var unconvertedBucket = {
	Bucket: `d2l-docbuilder-${s3Config.env}-unconverted`,
	ACL: 'private',
	CreateBucketConfiguration: {
		LocationConstraint: s3Config.region
	}
};

var convertedBucket = {
	Bucket: `d2l-docbuilder-${s3Config.env}-converted`,
	ACL: 'private',
	CreateBucketConfiguration: {
		LocationConstraint: s3Config.region
	}
};

var unconvertedBucketExists = false, convertedBucketExists = false;

console.log(unconvertedBucket.Bucket);

s3.listBucketsAsync()
	.then(result => {
		result.Buckets.forEach(bucket => {
			if(bucket.Name === unconvertedBucket.Bucket) {
				unconvertedBucketExists = true;
			}

			if(bucket.Name === convertedBucket.Bucket) {
				convertedBucket = true;
			}
		});

		if(!unconvertedBucketExists) {
			return s3.createBucketAsync(unconvertedBucket);
		}
	})
	.then(() => {
		console.log(`Bucket ${unconvertedBucket.Bucket} was successfully created.`);

		var lifecycleConfig = {
			Bucket: unconvertedBucket.Bucket,
			LifecycleConfiguration: {
				Rules: [
					{
						Prefix: '',
						Status: 'Enabled',
						Expiration: {
							Days: 7
						}
					}
				]
			}
		};

		return s3.putBucketLifecycleConfigurationAsync(lifecycleConfig);
	})
	.then(() => {
		console.log(`Lifecycle settings saved for bucket ${unconvertedBucket.Bucket}.`);
		
		if(!convertedBucketExists) {
			return s3.createBucketAsync(convertedBucket);
		}
	})
	.then(() => {
		console.log(`Bucket ${convertedBucket.Bucket} was created successfully.`);
		console.log('AWS S3 deployment completed successfully.');
	})
	.catch(err => {
		console.error('Deployment failed: ' + err);
	});