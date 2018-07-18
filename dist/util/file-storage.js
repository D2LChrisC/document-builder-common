'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function openReadStream(filename) {
	return new _bluebird2.default(function (resolve, reject) {
		var stream = _fs2.default.createReadStream(filename);

		stream.on('open', function () {
			resolve(stream);
		});

		stream.on('error', function (err) {
			reject(err);
		});
	});
}

function doMultipartUpload(opts) {
	return new _bluebird2.default(function (resolve, reject) {

		var partIndex = 1;
		var buffer = void 0;
		var abort = false;
		var map = [];

		var onFailure = function onFailure(err) {
			opts.s3.abortMultipartUploadAsync({
				Bucket: opts.bucket,
				Key: opts.key,
				UploadId: opts.uploadId
			}).catch(function (abortErr) {
				reject({
					error: 'Could not abort a failed multipart upload to S3.',
					reason: abortErr,
					originalFailure: err
				});
			}).finally(function () {
				reject(err);
			});
		};

		var completeUpload = function completeUpload() {
			opts.s3.completeMultipartUploadAsync({
				Bucket: opts.bucket,
				Key: opts.key,
				UploadId: opts.uploadId,
				MultipartUpload: {
					Parts: map
				}
			}).then(function () {
				resolve();
			}).catch(onFailure);
		};

		var unpauseStream = function unpauseStream() {
			if (!abort) {
				opts.stream.resume();
			}
		};

		opts.stream.on('error', function (streamErr) {
			abort = true;
			reject(streamErr);
		});

		opts.stream.on('data', function (data) {
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
					Body: buffer,
					ContentLength: buffer.length
				}).then(function (partResult) {
					map.push({
						ETag: partResult.ETag,
						PartNumber: partIndex
					});
					partIndex++;
					buffer = null;
					unpauseStream();
				}).catch(onFailure);
			}
		});

		opts.stream.on('end', function () {
			if (buffer) {
				opts.s3.uploadPartAsync({
					Bucket: opts.bucket,
					Key: opts.key,
					PartNumber: partIndex,
					UploadId: opts.uploadId,
					Body: buffer,
					ContentLength: buffer.length
				}).then(function (partResult) {
					map.push({
						ETag: partResult.ETag,
						PartNumber: partIndex
					});
					completeUpload();
				}).catch(reject);
			} else {
				completeUpload();
			}
		});
	});
}

var FileStorage = function () {
	function FileStorage(bucket, region, endpoint, encryptKey) {
		_classCallCheck(this, FileStorage);

		if (!bucket) {
			throw new TypeError('Bucket name must be specified in constructor.');
		}

		this.bucket = bucket;

		var awsConfig = {
			s3ForcePathStyle: true,
			signatureVersion: 'v4',
			region: region
		};

		if (endpoint) {
			awsConfig.endpoint = endpoint;
		}

		_awsSdk2.default.config.update(awsConfig);

		this.s3 = new _awsSdk2.default.S3({ apiVersion: '2006-03-01' });
		_bluebird2.default.promisifyAll(this.s3);

		this.encryptKey = encryptKey;
	}

	_createClass(FileStorage, [{
		key: 'putFile',
		value: function putFile(key, filename, contentType) {
			var _this = this;

			var fiveMB = 5242880;

			try {
				var stat = _fs2.default.statSync(filename);

				if (stat.size > fiveMB) {
					// If the file is larger than 5MB, use multipart uploading to
					// send in 5MB chunks. Uploading to S3 is very prone to failing
					// when uploading large files all in one shot!

					return this.multipartUpload(key, filename, contentType, fiveMB);
				}
			} catch (statErr) {
				return _bluebird2.default.reject(statErr);
			}

			return openReadStream(filename).then(function (stream) {
				return _this.s3.putObjectAsync({
					Bucket: _this.bucket,
					Key: key,
					Body: stream,
					ContentType: contentType,
					ServerSideEncryption: 'aws:kms',
					SSEKMSKeyId: _this.encryptKey,
					StorageClass: 'REDUCED_REDUNDANCY'
				});
			});
		}
	}, {
		key: 'multipartUpload',
		value: function multipartUpload(key, filename, contentType, chunkSize) {
			var _this2 = this;

			try {
				_fs2.default.statSync(filename);
			} catch (statErr) {
				return _bluebird2.default.reject(statErr);
			}

			return new _bluebird2.default(function (resolve, reject) {
				var uploadId = void 0;

				var stream = _fs2.default.createReadStream(filename);

				stream.once('open', function () {
					_this2.s3.createMultipartUploadAsync({
						Bucket: _this2.bucket,
						Key: key,
						ContentType: contentType,
						StorageClass: 'REDUCED_REDUNDANCY',
						ServerSideEncryption: 'aws:kms',
						SSEKMSKeyId: _this2.encryptKey
					}).then(function (result) {
						uploadId = result.UploadId;

						return doMultipartUpload({
							s3: _this2.s3,
							bucket: _this2.bucket,
							key: key,
							uploadId: uploadId,
							contentType: contentType,
							chunkSize: chunkSize,
							stream: stream
						});
					}).then(resolve).catch(reject);
				});
			});
		}

		/**
   * Resets file expiration. It changes LastModified file property.
   * Please PAY ATTENTION, it clears all `Metadata` values and `ContentType`
   */

	}, {
		key: 'resetFileExpiration',
		value: function resetFileExpiration(key, contentType, metadata) {
			return this.s3.copyObjectAsync({
				Bucket: this.bucket,
				CopySource: this.bucket + '/' + key,
				Key: key,
				ContentType: contentType,
				Metadata: metadata,
				MetadataDirective: 'REPLACE',
				ServerSideEncryption: 'aws:kms',
				SSEKMSKeyId: this.encryptKey
			});
		}
	}, {
		key: 'getFile',
		value: function getFile(key) {
			return this.s3.getObjectAsync({
				Bucket: this.bucket,
				Key: key
			}).then(function (data) {
				return {
					LastModified: data.LastModified,
					Expires: data.Expires,
					ContentLength: data.ContentLength,
					Body: data.Body,
					ContentType: data.ContentType
				};
			}).catch(function (err) {
				if (/.*NoSuchKey.*/i.test(err)) {
					return null;
				}

				throw err;
			});
		}
	}, {
		key: 'deleteFile',
		value: function deleteFile(key) {
			return this.s3.deleteObjectAsync({
				Bucket: this.bucket,
				Key: key
			}).catch(function (err) {
				if (/.*NoSuchKey.*/i.test(err)) {
					return null;
				}

				throw err;
			});
		}
	}, {
		key: 'getLinkToFile',
		value: function getLinkToFile(key) {
			var _this3 = this;

			return this.s3.headObjectAsync({
				Bucket: this.bucket,
				Key: key
			}).catch(function (err) {
				if (/.*NotFound.*/i.test(err)) {
					return '';
				}

				throw err;
			}).then(function (data) {
				if (data === '') {
					return null;
				}

				return _this3.s3.getSignedUrlAsync('getObject', {
					Bucket: _this3.bucket,
					Key: key
				});
			});
		}
	}]);

	return FileStorage;
}();

exports.default = FileStorage;