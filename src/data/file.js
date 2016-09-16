import joi from 'joi';
import Promise from 'bluebird';

module.exports = function(database) {
	const TableName = 'DocBuilder-Files';

	const File = database.define('File', {
		tableName: TableName,
		hashKey: 'checksum',
		rangeKey: 'format',
		schema: {
			checksum: joi.string().required(),
			format: joi.string().required().regex(/^(pdf|raw)$/),
			createdAt: joi.number().required().integer(),
			expires: joi.number().required().integer(),
			path: joi.string().required()
		}
	});

	return Promise.promisifyAll(File);
};
