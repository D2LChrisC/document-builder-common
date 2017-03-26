import AWS from 'aws-sdk';
import { expect } from 'chai';
import FileStorage from '../../src/util/file-storage';
import fs from 'fs';
import Bluebird from 'bluebird';
import sinon from 'sinon';

Bluebird.promisifyAll(fs);

const awsConfig = {
	s3ForcePathStyle: true,
	accessKeyId: 'key',
	secretAccessKey: 'secret',
	region: 'us-west-1',
	endpoint: new AWS.Endpoint('http://localhost:4569/')
};
AWS.config.update(awsConfig);

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const encryptionKeyId = 'b3257d00-170a-40ee-b374-ab923dbcb606';
const testBucket = 'my-test-bucket';
const storage = new FileStorage(
	testBucket,
	'key',
	'secret',
	'us-west-1',
	'http://localhost:4569',
	encryptionKeyId);

Bluebird.promisifyAll(s3);

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
			const stream = fs.createReadStream('tests/testAssets/BJCP-2015-Styleguide.docx');

			s3
				.uploadAsync({
					Bucket: testBucket,
					Key: key,
					Body: stream
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
			const stream = fs.createReadStream('tests/testAssets/diving-checklist.docx');

			s3
				.uploadAsync({
					Bucket: testBucket,
					Key: key,
					Body: stream
				})
				.then(() => {
					return storage.getFile(key);
				})
				.then(file => {
					expect(file).to.exist;
					expect(file.ContentLength).to.equal(13631);
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
			const stream = fs.createReadStream('tests/testAssets/diving-checklist.docx');

			s3
				.uploadAsync({
					Bucket: testBucket,
					Key: key,
					Body: stream
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
			const stream = fs.createReadStream('tests/testAssets/diving-checklist.docx');

			s3
				.uploadAsync({
					Bucket: testBucket,
					Key: key,
					Body: stream
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

	describe('multipartUpload function', () => {

		const mimeType = 'application/pdf';
		const chunkSize = 204800;

		let s3Mock, s3AbortSpy;

		afterEach(() => {
			if (s3Mock) {
				s3Mock.restore();
				s3Mock = null;
			}

			if (s3AbortSpy) {
				s3AbortSpy.restore();
				s3AbortSpy = null;
			}
		});

		it('will fail if file does not exist', done => {
			storage.multipartUpload(
				'does-not-exist',
				'tests/testAssets/not-there.pptx',
				mimeType,
				chunkSize)
				.then(() => {
					done('Call was not meant to succeed');
				})
				.catch(err => {
					expect(err.code).to.equal('ENOENT');
					done();
				});
		});

		it('will fail if multipart upload cannot be created in S3', done => {
			s3Mock = sinon
				.stub(storage.s3, 'createMultipartUploadAsync')
				.returns(Bluebird.reject('Fail'));

			storage.multipartUpload(
				'game-rules',
				'tests/testAssets/gameRules.pdf',
				mimeType,
				chunkSize)
				.then(() => {
					done('Call was not meant to succeed');
				})
				.catch(err => {
					expect(err).to.equal('Fail');
					done();
				});
		});

		it('will upload file in multiple pieces', done => {
			let bytes = 0;
			let expectedPartNumber = 1;
			const key = 'game-rules';

			const uploadPartStub = sinon
				.stub(storage.s3, 'uploadPartAsync')
				.callsFake(opts => {
					bytes += opts.Body.length;
					expect(opts.Bucket).to.equal(testBucket);
					expect(opts.Key).to.equal(key);
					expect(opts.PartNumber).to.equal(expectedPartNumber++);
					expect(opts.UploadId).to.exist;

					return Bluebird.resolve();
				});

			const completeUploadStub = sinon
				.stub(storage.s3, 'completeMultipartUploadAsync')
				.callsFake(opts => {
					expect(opts.Bucket).to.equal(testBucket);
					expect(opts.Key).to.equal(key);
					expect(opts.UploadId).to.exist;

					return Bluebird.resolve();
				});

			storage.multipartUpload(
				key,
				'tests/testAssets/gameRules.pdf',
				mimeType,
				chunkSize)
			.then(() => {
				expect(fs.statSync('tests/testAssets/gameRules.pdf').size).to.equal(bytes);
				done();
			})
			.catch(done)
			.finally(() => {
				uploadPartStub.restore();
				completeUploadStub.restore();
			});
		});

		it('will fail if a part cannot be uploaded.', done => {
			s3Mock = sinon
				.stub(storage.s3, 'uploadPartAsync')
				.callsFake(() => {
					return Bluebird.reject('Fail');
				});

			s3AbortSpy = sinon.spy(storage.s3, 'abortMultipartUploadAsync');

			storage.multipartUpload(
				'game-rules',
				'tests/testAssets/gameRules.pdf',
				mimeType,
				chunkSize)
				.then(() => {
					done('Call was not meant to succeed');
				})
				.catch(err => {
					expect(err).to.equal('Fail');
					expect(s3AbortSpy.calledOnce).to.be.true;
					done();
				});
		});

		it('will fail if the multipart upload cannot be finalized', done => {
			s3Mock = sinon
				.stub(storage.s3, 'completeMultipartUploadAsync')
				.callsFake(() => {
					return Bluebird.reject('Fail');
				});

			s3AbortSpy = sinon.spy(storage.s3, 'abortMultipartUploadAsync');

			storage.multipartUpload(
				'game-rules',
				'tests/testAssets/gameRules.pdf',
				mimeType,
				chunkSize)
				.then(() => {
					done('Call was not meant to succeed');
				})
				.catch(err => {
					expect(err).to.equal('Fail');
					expect(s3AbortSpy.calledOnce).to.be.true;
					done();
				});

		});

	});

});
