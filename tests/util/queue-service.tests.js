import { expect } from 'chai';
import queue from '../../src/util/queue-service';

function TestForException(options, done) {
	try {
		queue(options);
		done('Exception was not raised');
	} catch (err) {
		expect(err).to.exist;
	}

	done();
}

describe('Queue service wrapper', () => {

	let options;

	beforeEach(() => {
		options = {
			queueUrl: 'https://sqs.us-west-1.amazonaws.com/my-account/my-queue',
			accessKeyId: 'myawskey',
			secretAccessKey: 'secret!',
			region: 'us-west-1',
			messageHandler: (message, cb) => { cb(); }
		};
	});

	it('will return a new queue consumer', () => {
		const testQueue = queue(options);
		expect(testQueue).to.exist;
	});

	it('will fail if queueUrl is not provided', done => {
		options.queueUrl = undefined;
		TestForException(options, done);
	});

	it('will fail if queueUrl is not a valid URL', done => {
		options.queueUrl = 'this definitely won\'t work';
		TestForException(options, done);
	});

	it('will fail if accessKeyId is not provided', done => {
		options.accessKeyId = undefined;
		TestForException(options, done);
	});

	it('will fail if secretAccessKey is not provided', done => {
		options.secretAccessKey = undefined;
		TestForException(options, done);
	});

	it('will fail if region is not provided', done => {
		options.region = undefined;
		TestForException(options, done);
	});

	it('will fail if message handler is not provided', done => {
		options.messageHandler = undefined;
		TestForException(options, done);
	});

	it('will fail if message handler has too few arguments', done => {
		options.messageHandler = arg => { arg.fail(); };
		TestForException(options, done);
	});
});
