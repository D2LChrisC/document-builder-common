# Document Builder Common Utilities

[![Build Status](https://travis-ci.com/Brightspace/document-builder-common.svg?token=nkYKHxZ1oB1pMzaV4CpC&branch=master)](https://travis-ci.com/Brightspace/document-builder-common)
[![Coverage Status](https://coveralls.io/repos/github/Brightspace/document-builder-common/badge.svg?branch=master&t=KO1pVl)](https://coveralls.io/github/Brightspace/document-builder-common?branch=master)

## Usage

This package is not published to npmjs.com and so will need to be referenced directly in the package.json file. Add the following line to your `dependencies` section:

`"d2l-document-builder-common": "https://github.com/Brightspace/document-builder-common",`

Then run

```
npm install
```

to add it to the project.

### Dynamo DB Library

Example:

```
import { Database } from 'd2l-document-builder-common';

const db = new Database(
	'aws-key-id',
	'aws-secret',
	'us-east-1');

db.Conversion.createAsync({
		fileId: 'my-file-xyz-123',
		format: 'raw',
		createdAt: date,
		lastTouched: date,
		checksum: 'aoewigh3240239r3rhf0m30fj0324',
		status: 'Complete',
		fileUri: 'https://wherever.s3.amazon.com/myfile/xyz/123/file.txt',
		error: {
			id: 'http://errors.brightspace.com/failure',
			title: 'Something happened',
			description: 'Aspose failed.'
		}
	})
	.then(() => {
		// ...
	})
	.catch(err => {
		// ...
	});
```

The `Conversion` object exposed by the `db` isntance is a [Vogels](https://github.com/ryanfitz/vogels) table definition promisified with [Bluebird](http://bluebirdjs.com/docs/getting-started.html). See the coresponding documentation on how to use them.

### S3 Client

To use the S3 client, instantiate it like so:

```
import { FileStorage } from 'd2l-document-builder-common';

const storage = new FileStorage(
	'my-bucket-name',
	'aws-key-id',
	'aws-secret',
	'aws-region');

// ...
```

### Simple Queue Service Consumer

To consume messages from an SQS queue, a Consumer is required. One can be instantiated like so:

```
import { createQueue } from 'd2l-document-builder-common';

const options = {
	accessKeyId: 'my-aws-key',
	secretAccessKey: 'abcd1234',
	region: 'us-east-1',
	queueUrl: 'http://sqs.us-east-1.amazonaws.com/my-account/my-queue',
	messageHandler: (message, done) => {
		// ..
	}
};

createQueue(options);
```
The `options` object must have the following properties set:

* `accessKeyId` - This is the access key ID for making calls to the AWS APIs.
* `secretAccessKey` - The secret key used to authenticate the access key ID.
* `region` - The AWS region in which the SQS queue lives.
* `queueUrl` - The URL to the SQS queue for retrieving messages.
* `messageHandler` - A function to handle messages from the queue as they are received. The first parameter will be the message from the queue and the second parameter is a callback that should be called to alert SQS that the task has comleted and the message can be removed from the queue.

The consumer object returned by `createQueue` is provided by the [sqs-consumer](https://www.npmjs.com/package/sqs-consumer) library. Consult the library's documentation for more detail on how to use the consumer.
