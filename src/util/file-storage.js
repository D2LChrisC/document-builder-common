import AWS from 'aws-sdk';
import fs from 'fs';
import Promise from 'bluebird';

function openReadStream(filename) {
	return new Promise((resolve, reject) => {
		const stream = fs.createReadStream(filename);

		stream.on('open', () => {
			resolve(stream);
		});

		stream.on('error', err => {
			reject(err);
		});
	});
}

class FileStorage {
	constructor(bucket, accessKey, accessSecret, region, endpoint) {
		if (!bucket) {
			throw new TypeError('Bucket name must be specified in constructor.');
		}

		this.bucket = bucket;

		const awsConfig = {
			s3ForcePathStyle: true,
			accessKeyId: accessKey,
			secretAccessKey: accessSecret,
			signatureVersion: 'v4',
			region: region
		};

		if (endpoint) {
			awsConfig.endpoint = endpoint;
		}

		AWS.config.update(awsConfig);

		this.s3 = new AWS.S3({ apiVersion: '2006-03-01' });
		Promise.promisifyAll(this.s3);
	}

	putFile(key, filename) {
		return openReadStream(filename)
			.then(stream => {
				return this.s3.putObjectAsync({
					Bucket: this.bucket,
					Key: key,
					Body: stream
				});
			});
	}

	resetFileExpiration(key) {
		return this.s3
			.copyObjectAsync({
				Bucket: this.bucket,
				CopySource: `${this.bucket}/${key}`,
				Key: key
			});
	}

	getFile(key) {
		return this.s3
			.getObjectAsync({
				Bucket: this.bucket,
				Key: key
			})
			.then(data => {
				return {
					LastModified: data.LastModified,
					Expires: data.Expires,
					ContentLength: data.ContentLength,
					Body: data.Body
				};
			})
			.catch(err => {
				if (/.*NoSuchKey.*/i.test(err)) {
					return null;
				}

				throw err;
			});
	}

	deleteFile(key) {
		return this.s3
			.deleteObjectAsync({
				Bucket: this.bucket,
				Key: key
			})
			.catch(err => {
				if (/.*NoSuchKey.*/i.test(err)) {
					return null;
				}

				throw err;
			});
	}

	getLinkToFile(key) {
		return this.s3
			.headObjectAsync({
				Bucket: this.bucket,
				Key: key
			})
			.catch(err => {
				if (/.*NotFound.*/i.test(err)) {
					return '';
				}

				throw err;
			})
			.then(data => {
				if (data === '') {
					return null;
				}

				return this.s3.getSignedUrlAsync(
					'getObject',
					{
						Bucket: this.bucket,
						Key: key
					});
			});
	}
}

export default FileStorage;
