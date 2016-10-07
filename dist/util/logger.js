'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = createLogger;

var _bunyan = require('bunyan');

var _bunyan2 = _interopRequireDefault(_bunyan);

var _bunyanLogstashTcp = require('bunyan-logstash-tcp');

var _bunyanLogstashTcp2 = _interopRequireDefault(_bunyanLogstashTcp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createLogger(name, config) {
	config = config || { logLevel: 'debug' };

	var logStream = config.logFile ? { type: config.logType || 'rotating-file', path: config.logFile } : { stream: process.stdout };

	var logConfig = {
		name: name,
		streams: [logStream],
		level: config.logLevel
	};

	if (config.logstashHost) {
		var logstashStream = {
			type: 'raw',
			stream: _bunyanLogstashTcp2.default.createStream({
				host: config.logstashHost,
				port: config.logstashPort,

				// If connection is lost to logstash, attempt to reconnect every 200ms
				// for 20mins.
				max_connect_retries: 6000,
				retry_interval: 200
			})
		};

		logConfig.streams.push(logstashStream);
	}

	if (config.streams) {
		logConfig.streams = logConfig.streams.concat(config.streams);
	}

	return _bunyan2.default.createLogger(logConfig);
}