'use strict';

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (database) {
	var TableName = 'DocBuilder-Conversions';

	var Conversion = database.define('Conversion', {
		tableName: TableName,
		hashKey: 'fileId',
		rangeKey: 'format',
		schema: {
			fileId: _joi2.default.string().required(),
			format: _joi2.default.string().required().regex(/^(pdf|raw)$/),
			createdAt: _joi2.default.number().required().integer(),
			lastTouched: _joi2.default.number().required().integer(),
			checksum: _joi2.default.string(),
			status: _joi2.default.string().required().regex(/^(Complete|In progress|Failed|Cancelled|Expired|Pending)$/),
			fileUri: _joi2.default.string().uri(),
			error: {
				id: _joi2.default.string().uri(),
				title: _joi2.default.string(),
				description: _joi2.default.string()
			}
		}
	});

	return _bluebird2.default.promisifyAll(Conversion);
};