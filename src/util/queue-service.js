import AWS from 'aws-sdk';
import Joi from 'joi';
import Consumer from 'sqs-consumer';

const optionsSchema = Joi.object().keys({
	accessKeyId: Joi.string().required(),
	secretAccessKey: Joi.string().required(),
	region: Joi.string().required(),
	queueUrl: Joi.string().uri().required(),
	messageHandler: Joi.func().arity(2).required()
});

export default function(options) {
	options = options || {};

	const validation = Joi.validate(options, optionsSchema);
	if (validation.error) {
		throw validation.error;
	}

	const awsConfig = {
		accessKeyId: options.accessKeyId,
		secretAccessKey: options.secretAccessKey,
		region: options.region
	};

	if (options.endpoint) {
		awsConfig.endpoint = options.endpoint;
	}

	AWS.config.update(awsConfig);
	const awsSqs = new AWS.SQS({ version: '2012-11-05' });

	return new Consumer.create({
		region: options.region,
		queueUrl: options.queueUrl,
		handleMessage: options.messageHandler,
		sqs: awsSqs
	});
}
