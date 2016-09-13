# Document Builder Common Utilities

[![Build Status](https://travis-ci.com/Brightspace/document-builder-common.svg?token=nkYKHxZ1oB1pMzaV4CpC&branch=master)](https://travis-ci.com/Brightspace/document-builder-common)
[![Coverage Status](https://coveralls.io/repos/github/Brightspace/document-builder-common/badge.svg?branch=master&t=KO1pVl)](https://coveralls.io/github/Brightspace/document-builder-common?branch=master)

## Usage

This package is not published to npmjs.com and so will need to be referenced directly in the package.json file. Add the following line to your `dependencies` section:

`"document-builder-common": "https://github.com/Brightspace/document-builder-common",`

Then run

```
npm install
```

to add it to the project.

### Dynamo DB Library

Example:

```
import { Database } from 'document-builder-common';

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
import { FileStorage } from 'document-builder-common';

const storage = new FileStorage(
	'my-bucket-name',
	'aws-key-id',
	'aws-secret',
	'aws-region');

// ...
```