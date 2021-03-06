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
			format: joi.string().required().regex(/^(pdf|html)$/),
			createdAt: joi.number().required().integer(),
			expires: joi.number().required().integer(),
			status: joi.string().required().regex(/^(Complete|In progress|Failed|Pending)$/),
			error: {
				id: joi.string().uri(),
				title: joi.string(),
				description: joi.string()
			}
		}
	});

	return Promise.promisifyAll(File);
};
