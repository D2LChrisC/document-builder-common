import AWS from 'aws-sdk';
import vogels from 'vogels';

class DynamoDatabase {
	constructor(region, endpoint) {
		const dbConfig = {
			region: region
		};

		if (endpoint) {
			// This is for testing only.
			dbConfig.endpoint = endpoint;
			dbConfig.accessKeyId = 'key';
			dbConfig.secretAccessKey = 'secret';
		}

		AWS.config.update(dbConfig);
		const db = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
		vogels.dynamoDriver(db);

		this.Conversion = require('./conversion')(vogels);
		this.File = require('./file')(vogels);
	}
}

export default DynamoDatabase;
