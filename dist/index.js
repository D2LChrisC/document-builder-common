'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.isFormatSupported = exports.createQueue = exports.createLogger = exports.FileStorage = exports.Database = undefined;

var _database = require('./data/database');

var _database2 = _interopRequireDefault(_database);

var _fileStorage = require('./util/file-storage');

var _fileStorage2 = _interopRequireDefault(_fileStorage);

var _queueService = require('./util/queue-service');

var _queueService2 = _interopRequireDefault(_queueService);

var _logger = require('./util/logger');

var _logger2 = _interopRequireDefault(_logger);

var _misc = require('./util/misc');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Database = exports.Database = _database2.default;

var FileStorage = exports.FileStorage = _fileStorage2.default;

var createLogger = exports.createLogger = _logger2.default;

var createQueue = exports.createQueue = _queueService2.default;

var isFormatSupported = exports.isFormatSupported = _misc.isFormatSupported;

exports.default = {
	Database: _database2.default,
	FileStorage: _fileStorage2.default,
	createLogger: createLogger,
	createQueue: _queueService2.default,
	isFormatSupported: _misc.isFormatSupported
};


module.exports = {
	Database: _database2.default,
	FileStorage: _fileStorage2.default,
	createLogger: createLogger,
	createQueue: _queueService2.default,
	isFormatSupported: _misc.isFormatSupported
};