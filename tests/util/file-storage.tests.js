import AWS from 'aws-sdk';
import { expect } from 'chai';
import FileStorage from '../../src/util/file-storage';
import fs from 'fs';
import Promise from 'bluebird';

Promise.promisifyAll(fs);

const awsConfig = {
	s3ForcePathStyle: true,
	accessKeyId: 'key',
	secretAccessKey: 'secret',
	region: 'us-west-1',
	endpoint: new AWS.Endpoint('http://localhost:4569/')
};
AWS.config.update(awsConfig);

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const testBucket = 'my-test-bucket';
const storage = new FileStorage(
	testBucket,
	'key',
	'secret',
	'us-west-1',
	'http://localhost:4569');

Promise.promisifyAll(s3);

function openReadStream(filename) {
	return new Promise((resolve, reject) => {
		const stream = fs.createReadStream(filename);

		stream.on('open', () => {
			resolve(stream);
		});

		stream.on('error', err => {
			reject(err);
		});
	});
}

describe('File storgage utility', () => {

	before(done => {
		s3.createBucketAsync({ Bucket: testBucket })
			.then(() => done())
			.catch(err => done(err));
	});

	after(done => {
		s3.deleteBucketAsync({ Bucket: testBucket })
			.catch(() => {})
			.finally(() => done());
	});

	describe('putFile function', () => {

		it('can save a file', done => {
			const key = 'diving-original';

			storage
				.putFile(
					key,
					'tests/testAssets/diving-checklist.docx')
				.then(() => {
					return s3.getObjectAsync({
						Bucket: testBucket,
						Key: key
					});
				})
				.then(data => {
					expect(data).to.exist;
					expect(data.Body).to.exist;
					done();
				})
				.catch(err => done(err));
		});

		it('can overwrite a file', done => {
			const key = 'diving-overwrite';

			openReadStream('tests/testAssets/BJCP-2015-Styleguide.docx')
				.then(stream => {
					return s3.uploadAsync({
						Bucket: testBucket,
						Key: key,
						Body: stream
					});
				})
				.then(() => {
					return storage.putFile(
						key,
						'tests/testAssets/diving-checklist.docx');
				})
				.then(() => {
					return s3.getObjectAsync({
						Bucket: testBucket,
						Key: key
					});
				})
				.then(data => {
					expect(data).to.exist;
					expect(data.Body).to.exist;
					done();
				})
				.catch(err => done(err));
		});

		it('will fail if file is missing', done => {
			const key = 'does-not-exist';

			storage.putFile(
				key,
				'tests/testAssets/not-there.pptx')
				.then(() => {
					done('No error was thrown');
				})
				.catch(err => {
					expect(err).to.match(/.*ENOENT.*/i);
					done();
				});
		});

	});

	describe('getFile function', () => {

		it('will retrieve a file from s3', done => {
			const key = 'retrieve-me';

			openReadStream('tests/testAssets/diving-checklist.docx')
				.then(stream => {
					return s3.uploadAsync({
						Bucket: testBucket,
						Key: key,
						Body: stream
					});
				})
				.then(() => {
					return storage.getFile(key);
				})
				.then(file => {
					expect(file).to.exist;
					expect(file.ContentLength).to.equal('13631');
					expect(file.Body).to.exist;
					done();
				})
				.catch(err => done(err));
		});

		it('will return null if file is not found', done => {
			const key = 'not-there';

			storage.getFile(key)
				.then(file => {
					expect(file).to.not.exist;
					done();
				})
				.catch(err => done(err));
		});

	});

	describe('deleteFile function', () => {

		it('will delete a file from S3', done => {
			const key = 'delete-me';

			openReadStream('tests/testAssets/diving-checklist.docx')
				.then(stream => {
					return s3.uploadAsync({
						Bucket: testBucket,
						Key: key,
						Body: stream
					});
				})
				.then(() => {
					return storage.deleteFile(key);
				})
				.then(() => {
					return s3.getObjectAsync({
						Bucket: testBucket,
						Key: key
					});
				})
				.catch(err => {
					if (/.*NoSuchKey.*/i.test(err)) {
						return done();
					}

					done(err);
				});
		});

		it('will succeed if file does not exist', done => {
			const key = 'delete-wat';

			storage.deleteFile(key)
				.then(() => done())
				.catch(done);
		});

	});

	describe('getLinkToFile function', () => {

		it('will return a signed URL for a file', done => {
			const key = 'get-my-url';

			openReadStream('tests/testAssets/diving-checklist.docx')
				.then(stream => {
					return s3.uploadAsync({
						Bucket: testBucket,
						Key: key,
						Body: stream
					});
				})
				.then(() => {
					return storage.getLinkToFile(key);
				})
				.then(url => {
					expect(url).to.contain('http://localhost:4569/');
					done();
				})
				.catch(err => done(err));

		});

		it('will return null if the file is not found', done => {
			const key = 'no-such-key';
			storage.getLinkToFile(key)
				.then(url => {
					expect(url).to.not.exist;
					done();
				})
				.catch(err => done(err));
		});

	});

});
