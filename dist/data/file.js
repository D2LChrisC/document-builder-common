'use strict';

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (database) {
	var TableName = 'DocBuilder-Files';

	var File = database.define('File', {
		tableName: TableName,
		hashKey: 'checksum',
		rangeKey: 'format',
		schema: {
			checksum: _joi2.default.string().required(),
			format: _joi2.default.string().required().regex(/^(pdf|raw)$/),
			createdAt: _joi2.default.number().required().integer(),
			expires: _joi2.default.number().required().integer(),
			path: _joi2.default.string().required()
		}
	});

	return _bluebird2.default.promisifyAll(File);
};