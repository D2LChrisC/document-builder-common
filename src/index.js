import DynamoDatabase from './data/database';
import S3FileStorage from './util/file-storage';

export const Database = DynamoDatabase;

export const FileStorage = S3FileStorage;

export * from './util/logger';

export default {
	Database: DynamoDatabase,
	FileStorage: S3FileStorage
};

module.exports = {
	Database: DynamoDatabase,
	FileStorage: S3FileStorage
};
