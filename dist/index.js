'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.FileStorage = exports.Database = undefined;

var _logger = require('./util/logger');

Object.keys(_logger).forEach(function (key) {
	if (key === "default" || key === "__esModule") return;
	Object.defineProperty(exports, key, {
		enumerable: true,
		get: function get() {
			return _logger[key];
		}
	});
});

var _database = require('./data/database');

var _database2 = _interopRequireDefault(_database);

var _fileStorage = require('./util/file-storage');

var _fileStorage2 = _interopRequireDefault(_fileStorage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Database = exports.Database = _database2.default;

var FileStorage = exports.FileStorage = _fileStorage2.default;

exports.default = {
	Database: _database2.default,
	FileStorage: _fileStorage2.default
};


module.exports = {
	Database: _database2.default,
	FileStorage: _fileStorage2.default
};