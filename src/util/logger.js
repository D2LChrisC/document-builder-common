import AWS from 'aws-sdk';
import bunyan from 'bunyan';
import firehose from 'bunyan-firehose';
import uuid from 'uuid/v4';

export default function createLogger(name, config) {
	config = config || { logLevel: 'debug' };

	const logStream = config.logFile ?
		{ type: config.logType || 'rotating-file', path: config.logFile } :
		{ stream: process.stdout };

	const logConfig = {
		name: name,
		streams: [logStream],
		level: config.logLevel
	};

	if (config.firehoseStream) {
		const credentials = new AWS.TemporaryCredentials({
			RoleArn: config.firehoseRole,
			RoleSessionName: uuid(),
			DurationSeconds: 3600
		});

		const firehoseStream = firehose.createStream({
			streamName: config.firehoseStream,
			region: 'us-east-1',
			credentials: credentials
		});

		firehoseStream.on('error', err => {
			console.log('Failed to log to Firehose:', err);
		});

		logConfig.streams.push({
			stream: firehoseStream,
			type: 'raw'
		});
	}

	if (config.streams) {
		logConfig.streams = logConfig.streams.concat(config.streams);
	}

	return bunyan.createLogger(logConfig);
}
