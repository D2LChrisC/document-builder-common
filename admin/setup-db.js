'use strict';

var aws = require('aws-sdk');
var Promise = require('bluebird');

if(process.argv.length === 2) {
	console.log('Usage:\nnode setup-db.js AWS_KEY_ID AWS_SECRET_KEY [AWS_REGION]');
	console.log('\tIf AWS_REGION is omitted the default will be us-east-1.\n\n- or -\n');
	console.log('node setup-db.js END_POINT');
	console.log('Use END_POINT to set up a local instance of the database.');
	return;
}

var dbConfig = {
	accessKeyId: 'key',
	secretAccessKey: 'secret',
	region: 'us-east-1'
};

if(process.argv.length === 3) {
	dbConfig.endpoint = process.argv[2]
} else {
	dbConfig.accessKeyId = process.argv[2];
	dbConfig.secretAccessKey = process.argv[3];

	if(process.argv.length >= 5) {
		dbConfig.region = process.argv[4];
	}
}

console.log('Access Key ID:\t\t' + dbConfig.accessKeyId);
console.log('Secret Access Key:\t' + dbConfig.secretAccessKey);
console.log('Region:\t\t\t' + dbConfig.region);
console.log('End point:\t\t' + dbConfig.endpoint);

aws.config.update(dbConfig);

var dynamoDb = Promise.promisifyAll(new aws.DynamoDB({ apiVersion: '2012-08-10' }));

var conversionsTable = {
	TableName: 'DocBuilder-Conversions',
	KeySchema: [
		{ AttributeName: 'fileId', KeyType: 'HASH' },
		{ AttributeName: 'format', KeyType: 'RANGE' }
	],
	AttributeDefinitions: [
		{ AttributeName: 'fileId', AttributeType: 'S' },
		{ AttributeName: 'format', AttributeType: 'S' }
	],
	ProvisionedThroughput: {
		ReadCapacityUnits: 10,
		WriteCapacityUnits: 10
	}
};

var filesTable = {
	TableName: 'DocBuilder-Files',
	KeySchema: [
		{ AttributeName: 'checksum', KeyType: 'HASH' },
		{ AttributeName: 'format', KeyType: 'RANGE' }
	],
	AttributeDefinitions: [
		{ AttributeName: 'checksum', AttributeType: 'S' },
		{ AttributeName: 'format', AttributeType: 'S' }
	],
	ProvisionedThroughput: {
		ReadCapacityUnits: 10,
		WriteCapacityUnits: 10
	}
};

var existingTables;

dynamoDb
	.listTablesAsync()
	.then(tables => {
		existingTables = tables;
		if(existingTables.TableNames.indexOf('DocBuilder-Conversions') === -1) {
			return dynamoDb.createTableAsync(conversionsTable);
		}

		console.log('Conversions table already exists.');
	})
	.then(result => {
		if(result) {
			console.log('Conversions table created successfully.');
		}

		if(existingTables.TableNames.indexOf('DocBuilder-Files') === -1) {
			return dynamoDb.createTableAsync(filesTable);
		}

		console.log('Files table already exists.');
	})
	.then(result => {
		if(result) {
			console.log('Files table created successfully.');
		}

		console.log('Database has been deployed.');
	})
	.catch(err => {
		console.error('Deployment of database failed:  ' + err);
	});