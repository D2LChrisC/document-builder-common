'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

exports.default = function (options) {
	options = options || {};

	var validation = _joi2.default.validate(options, optionsSchema);
	if (validation.error) {
		throw validation.error;
	}

	var awsConfig = {
		accessKeyId: options.accessKeyId,
		secretAccessKey: options.secretAccessKey,
		region: options.region
	};

	if (options.endpoint) {
		awsConfig.endpoint = options.endpoint;
	}

	_awsSdk2.default.config.update(awsConfig);
	var awsSqs = new _awsSdk2.default.SQS({ version: '2012-11-05' });

	return new _sqsConsumer2.default.create({
		region: options.region,
		queueUrl: options.queueUrl,
		handleMessage: options.messageHandler,
		sqs: awsSqs
	});
};

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _sqsConsumer = require('sqs-consumer');

var _sqsConsumer2 = _interopRequireDefault(_sqsConsumer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var optionsSchema = _joi2.default.object().keys({
	accessKeyId: _joi2.default.string().required(),
	secretAccessKey: _joi2.default.string().required(),
	region: _joi2.default.string().required(),
	queueUrl: _joi2.default.string().uri().required(),
	messageHandler: _joi2.default.func().arity(2).required()
});