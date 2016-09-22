import DynamoDatabase from './data/database';
import S3FileStorage from './util/file-storage';
import logger from './util/logger';

export const Database = DynamoDatabase;

export const FileStorage = S3FileStorage;

export const createLogger = logger;

export default {
	Database: DynamoDatabase,
	FileStorage: S3FileStorage,
	createLogger: createLogger
};

module.exports = {
	Database: DynamoDatabase,
	FileStorage: S3FileStorage,
	createLogger: createLogger
};
