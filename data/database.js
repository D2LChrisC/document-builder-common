import AWS from 'aws-sdk';
import vogels from 'vogels';

class DynamoDatabase {
	constructor(keyId, secretKey, region, endpoint) {
		const dbConfig = {
			accessKeyId: keyId,
			secretAccessKey: secretKey,
			region: region
		};

		if (endpoint) {
			dbConfig.endpoint = endpoint;
		}

		AWS.config.update(dbConfig);
		const db = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
		vogels.dynamoDriver(db);

		this.Conversion = require('./conversion')(vogels);
	}
}

export default DynamoDatabase;
