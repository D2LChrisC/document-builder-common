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

var FileStorage = function () {
	function FileStorage(bucket, accessKey, accessSecret, region, endpoint) {
		_classCallCheck(this, FileStorage);

		if (!bucket) {
			throw new TypeError('Bucket name must be specified in constructor.');
		}

		this.bucket = bucket;

		var awsConfig = {
			s3ForcePathStyle: true,
			accessKeyId: accessKey,
			secretAccessKey: accessSecret,
			signatureVersion: 'v4',
			region: region
		};

		if (endpoint) {
			awsConfig.endpoint = endpoint;
		}

		_awsSdk2.default.config.update(awsConfig);

		this.s3 = new _awsSdk2.default.S3({ apiVersion: '2006-03-01' });
		_bluebird2.default.promisifyAll(this.s3);
	}

	_createClass(FileStorage, [{
		key: 'putFile',
		value: function putFile(key, filename, expiration) {
			var _this = this;

			var expirationTime = new Date(new Date(Date.now()).getTime() + expiration * 1000);

			return openReadStream(filename).then(function (stream) {
				return _this.s3.putObjectAsync({
					Bucket: _this.bucket,
					Key: key,
					Body: stream,
					Expires: expirationTime
				});
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
					ContentLength: data.ContentLength,
					Body: data.Body
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
			var _this2 = this;

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

				return _this2.s3.getSignedUrlAsync('getObject', {
					Bucket: _this2.bucket,
					Key: key
				});
			});
		}
	}]);

	return FileStorage;
}();

exports.default = FileStorage;