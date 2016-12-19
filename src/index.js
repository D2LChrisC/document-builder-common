import DynamoDatabase from './data/database';
import S3FileStorage from './util/file-storage';
import logger from './util/logger';
import { isFormatSupported as formatSupported } from './util/misc';

export const Database = DynamoDatabase;

export const FileStorage = S3FileStorage;

export const createLogger = logger;

export const isFormatSupported = formatSupported;

export default {
	Database: DynamoDatabase,
	FileStorage: S3FileStorage,
	createLogger: createLogger,
	isFormatSupported: formatSupported
};

module.exports = {
	Database: DynamoDatabase,
	FileStorage: S3FileStorage,
	createLogger: createLogger,
	isFormatSupported: formatSupported
};
