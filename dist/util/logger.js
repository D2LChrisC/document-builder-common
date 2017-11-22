'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = createLogger;

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _bunyan = require('bunyan');

var _bunyan2 = _interopRequireDefault(_bunyan);

var _bunyanFirehose = require('bunyan-firehose');

var _bunyanFirehose2 = _interopRequireDefault(_bunyanFirehose);

var _v = require('uuid/v4');

var _v2 = _interopRequireDefault(_v);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createLogger(name, config) {
	config = config || { logLevel: 'debug' };

	var logStream = config.logFile ? { type: config.logType || 'rotating-file', path: config.logFile } : { stream: process.stdout };

	var logConfig = {
		name: name,
		streams: [logStream],
		level: config.logLevel
	};

	if (config.firehoseStream) {
		var credentials = new _awsSdk2.default.TemporaryCredentials({
			RoleArn: config.firehoseRole,
			RoleSessionName: (0, _v2.default)(),
			DurationSeconds: 3600
		}, new _awsSdk2.default.Credentials(config.accessKeyId, config.secretAccessKey));

		var firehoseStream = _bunyanFirehose2.default.createStream({
			streamName: config.firehoseStream,
			region: 'us-east-1',
			credentials: credentials
		});

		firehoseStream.on('error', function (err) {
			console.log('Failed to log to Firehose:', err);
		});

		logConfig.streams.push({
			stream: firehoseStream,
			type: 'raw'
		});
	}

	if (config.streams) {
		logConfig.streams = logConfig.streams.concat(config.streams);
	}

	return _bunyan2.default.createLogger(logConfig);
}