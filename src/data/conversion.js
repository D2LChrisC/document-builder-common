import joi from 'joi';
import Promise from 'bluebird';

module.exports = function(database) {
	const TableName = 'DocBuilder-Conversions';

	const Conversion = database.define('Conversion', {
		tableName: TableName,
		hashKey: 'fileId',
		rangeKey: 'format',
		schema: {
			fileId: joi.string().required(),
			format: joi.string().required().regex(/^(pdf|txt)$/),
			createdAt: joi.number().required().integer(),
			lastTouched: joi.number().required().integer(),
			checksum: joi.string()
		}
	});

	return Promise.promisifyAll(Conversion);
};
