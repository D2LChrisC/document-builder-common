'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.createLogger = createLogger;

var _bunyan = require('bunyan');

var _bunyan2 = _interopRequireDefault(_bunyan);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createLogger(name, config) {
	config = config || { logLevel: 'debug' };

	var logStream = config.logFile ? { type: config.logType || 'rotating-file', path: config.logFile } : { stream: process.stdout };

	logStream.level = config.logLevel;

	var logConfig = { name: name, streams: [logStream] };

	if (config.streams) {
		logConfig.streams = logConfig.streams.concat(config.streams);
	}

	return _bunyan2.default.createLogger(logConfig);
}