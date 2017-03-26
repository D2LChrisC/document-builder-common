import AWS from 'aws-sdk';
import fs from 'fs';
import Bluebird from 'bluebird';

function openReadStream(filename) {
	return new Bluebird((resolve, reject) => {
		const stream = fs.createReadStream(filename);

		stream.on('open', () => {
			resolve(stream);
		});

		stream.on('error', err => {
			reject(err);
		});
	});
}

function doMultipartUpload(opts) {
	return new Bluebird((resolve, reject) => {

		let partIndex = 1;
		let buffer;
		let abort = false;

		const onFailure = err => {
			opts.s3.abortMultipartUploadAsync({
				Bucket: opts.bucket,
				Key: opts.key,
				UploadId: opts.uploadId
			})
			.catch(abortErr => {
				reject({
					error: 'Could not abort a failed multipart upload to S3.',
					reason: abortErr,
					originalFailure: err
				});
			})
			.finally(() => {
				reject(err);
			});
		};

		const completeUpload = () => {
			opts.s3.completeMultipartUploadAsync({
				Bucket: opts.bucket,
				Key: opts.key,
				UploadId: opts.uploadId
			})
			.then(() => {
				resolve();
			})
			.catch(onFailure);
		};

		const unpauseStream = () => {
			if (!abort) {
				opts.stream.resume();
			}
		};

		opts.stream.on('error', streamErr => {
			abort = true;
			reject(streamErr);
		});

		opts.stream.on('data', data => {
			if (!buffer) {
				buffer = data;
			} else {
				buffer = Buffer.concat([buffer, data]);
			}

			if (buffer.length >= opts.chunkSize) {
				opts.stream.pause();
				opts.s3.uploadPartAsync({
					Bucket: opts.bucket,
					Key: opts.key,
					PartNumber: partIndex,
					UploadId: opts.uploadId,
					Body: buffer
				})
				.then(() => {
					partIndex++;
					buffer = null;
					unpauseStream();
				})
				.catch(onFailure);
			}
		});

		opts.stream.on('end', () => {
			if (buffer) {
				opts.s3.uploadPartAsync({
					Bucket: opts.bucket,
					Key: opts.key,
					PartNumber: partIndex,
					UploadId: opts.uploadId,
					Body: buffer
				})
				.then(completeUpload)
				.catch(reject);
			} else {
				completeUpload();
			}
		});
	});
}

class FileStorage {
	constructor(bucket, accessKey, accessSecret, region, endpoint, encryptKey) {
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
		Bluebird.promisifyAll(this.s3);

		this.encryptKey = encryptKey;
	}

	putFile(key, filename, contentType) {
		return openReadStream(filename)
			.then(stream => {
				return this.s3.putObjectAsync({
					Bucket: this.bucket,
					Key: key,
					Body: stream,
					ContentType: contentType,
					ServerSideEncryption: 'aws:kms',
					SSEKMSKeyId: this.encryptKey,
					StorageClass: 'REDUCED_REDUNDANCY'
				});
			});
	}

	multipartUpload(key, filename, contentType, chunkSize) {
		try {
			fs.statSync(filename);
		} catch (statErr) {
			return Bluebird.reject(statErr);
		}

		return new Bluebird((resolve, reject) => {
			let uploadId;

			const stream = fs.createReadStream(filename);

			stream.once('open', () => {
				this.s3.createMultipartUploadAsync({
					Bucket: this.bucket,
					Key: key,
					ContentType: contentType,
					StorageClass: 'REDUCED_REDUNDANCY',
					ServerSideEncryption: 'aws:kms',
					SSEKMSKeyId: this.encryptKey
				})
				.then(result => {
					uploadId = result.UploadId;

					return doMultipartUpload({
						s3: this.s3,
						bucket: this.bucket,
						key: key,
						uploadId: uploadId,
						contentType: contentType,
						chunkSize: chunkSize,
						stream: stream
					});
				})
				.then(resolve)
				.catch(reject);
			});
		});
	}

	/**
	 * Resets file expiration. It changes LastModified file property.
	 * Please PAY ATTENTION, it clears all `Metadata` values and `ContentType`
	 */
	resetFileExpiration(key, contentType, metadata) {
		return this.s3
			.copyObjectAsync({
				Bucket: this.bucket,
				CopySource: `${this.bucket}/${key}`,
				Key: key,
				ContentType: contentType,
				Metadata: metadata,
				MetadataDirective: 'REPLACE',
				ServerSideEncryption: 'aws:kms',
				SSEKMSKeyId: this.encryptKey
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
					Body: data.Body,
					ContentType: data.ContentType
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
