import bunyan from 'bunyan';
import logstash from 'bunyan-logstash-tcp';

export default function createLogger(name, config) {
	config = config || { logLevel: 'debug' };

	const logStream = config.logFile ?
		{ type: config.logType || 'rotating-file', path: config.logFile } :
		{ stream: process.stdout };

	logStream.level = config.logLevel;

	const logConfig = { name: name, streams: [logStream] };

	if (config.logstashHost) {
		const logstashStream = {
			type: 'raw',
			stream: logstash.createStream({
				host: config.logstashHost,
				port: config.logstashPort,

				// If connection is lost to logstash, attempt to reconnect every 200ms
				// for 20mins.
				max_connect_retries: 6000,
				retry_interval: 200
			})
		};

		logConfig.streams.push(logstashStream);
	}

	if (config.streams) {
		logConfig.streams = logConfig.streams.concat(config.streams);
	}

	return bunyan.createLogger(logConfig);
}
