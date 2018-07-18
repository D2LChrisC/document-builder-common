'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _vogels = require('vogels');

var _vogels2 = _interopRequireDefault(_vogels);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DynamoDatabase = function DynamoDatabase(region, endpoint) {
	_classCallCheck(this, DynamoDatabase);

	var dbConfig = {
		region: region
	};

	if (endpoint) {
		// This is for testing only.
		dbConfig.endpoint = endpoint;
		dbConfig.accessKeyId = 'key';
		dbConfig.secretAccessKey = 'secret';
	}

	_awsSdk2.default.config.update(dbConfig);
	var db = new _awsSdk2.default.DynamoDB({ apiVersion: '2012-08-10' });
	_vogels2.default.dynamoDriver(db);

	this.Conversion = require('./conversion')(_vogels2.default);
	this.File = require('./file')(_vogels2.default);
};

exports.default = DynamoDatabase;