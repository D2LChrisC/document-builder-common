import AWS from 'aws-sdk';
import bunyan from 'bunyan';
import firehose from 'bunyan-firehose';

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
			RoleSessionName: 'docs-logging',
			DurationSeconds: 3600
		},
		new AWS.Credentials(
			config.accessKeyId,
			config.secretAccessKey
		));

		const firehoseStream = firehose.createStream({
			streamName: config.firehoseStream,
			region: 'us-east-1',
			credentials: credentials
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
