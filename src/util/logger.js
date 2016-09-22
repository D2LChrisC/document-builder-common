import bunyan from 'bunyan';

export default function createLogger(name, config) {
	config = config || { logLevel: 'debug' };

	const logStream = config.logFile ?
		{ type: config.logType || 'rotating-file', path: config.logFile } :
		{ stream: process.stdout };

	logStream.level = config.logLevel;

	const logConfig = { name: name, streams: [logStream] };

	if (config.streams) {
		logConfig.streams = logConfig.streams.concat(config.streams);
	}

	return bunyan.createLogger(logConfig);
}
