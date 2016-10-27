import Database from '../../src/data/database';
import { expect } from 'chai';

const db = new Database(
	'key',
	'secret',
	'us-east-1',
	'http://localhost:7777/');
const File = db.File;

function testValidation(item, failMessage, callback) {
	File.createAsync(item)
		.then(() => callback(failMessage))
		.catch(err => {
			expect(err.cause.name).to.equal('ValidationError');
			callback();
		});
}

describe('File class', () => {

	describe('validation', () => {

		let file = {};

		beforeEach(() => {
			const date = (new Date()).getTime();
			const expires = Date.parse('January 5, 2025');
			file = {
				checksum: 'aoewigh3240239r3rhf0m30fj0324',
				format: 'pdf',
				createdAt: date,
				expires: expires,
				status: 'Complete',
				fileUri: 'https://s3.amazon.com/myfile',
				fileUriExpires: expires,
				error: {
					id: 'http://errors.brightspace.com/failure',
					title: 'Something happened',
					description: 'Aspose failed.'
				}
			};
		});

		it('prevents missing checksum', done => {
			file.checksum = undefined;
			testValidation(file, 'File was saved without an MD5 checkum.', done);
		});

		it('prevents missing format', done => {
			file.format = undefined;
			testValidation(file, 'File was saved without a format.', done);
		});

		it('prevents invalid format', done => {
			file.format = 'mp3';
			testValidation(file, 'File was saved with an invalid format.', done);
		});

		it('prevents missing created at date', done => {
			file.createdAt = undefined;
			testValidation(file, 'File was saved without a Created At date.', done);
		});

		it('prevents non-numeric created at date', done => {
			file.createdAt = '2015-03-25T12:00:00';
			testValidation(file, 'File was saved with a non-numeric Created At date.', done);
		});

		it('prevents missing expiration date', done => {
			file.expires = undefined;
			testValidation(file, 'File was saved without an expiration date.', done);
		});

		it('prevents non-numeric expiration date', done => {
			file.expires = '2015-03-25T12:00:00';
			testValidation(file, 'File was saved with a non-numeric expiration date.', done);
		});

		it('prevents missing status code', done => {
			file.status = undefined;
			testValidation(file, 'File was saved without a Status.', done);
		});

		it('prevents invalid status code', done => {
			file.status = 'Waiting on coffee';
			testValidation(file, 'File was saved with an invalid Status', done);
		});
	});

	describe('CRUD operations', () => {
		let file = {};

		beforeEach(() => {
			const date = (new Date()).getTime();
			const expires = Date.parse('January 5, 2025');
			file = {
				checksum: 'aoewigh3240239r3rhf0m30fj0324',
				format: 'pdf',
				status: 'Complete',
				createdAt: date,
				expires: expires,
				error: {
					id: 'http://errors.brightspace.com/failure',
					title: 'Something happened',
					description: 'Aspose failed.'
				}
			};
		});

		afterEach(done => {
			File.destroyAsync(file.checksum, file.format)
				.then(() => done())
				.catch(err => done(err));
		});

		it('can save a file record', done => {
			File.createAsync(file)
				.then(() => {
					return File.getAsync(
						file.checksum,
						file.format);
				})
				.then(result => {
					expect(result).to.exist;
					expect(result.get('checksum')).to.equal(file.checksum);
					expect(result.get('format')).to.equal(file.format);
					expect(result.get('createdAt')).to.equal(file.createdAt);
					expect(result.get('expires')).to.equal(file.expires);
					expect(result.get('status')).to.equal(file.status);
					expect(result.get('error')).to.eql(file.error);
					done();
				})
				.catch(err => done(err));
		});

		it('can update existing file records', done => {
			file.checksum = '79054025255fb1a26e4bc422aef54eb4';

			File.createAsync(file)
				.then(() => {
					file.expires = (new Date()).getTime();
					file.status = 'Failed';

					return File.updateAsync(file);
				})
				.then(() => {
					return File.getAsync(
						file.checksum,
						file.format);
				})
				.then(result => {
					expect(result).to.exist;
					expect(result.get('checksum')).to.equal(file.checksum);
					expect(result.get('format')).to.equal(file.format);
					expect(result.get('createdAt')).to.equal(file.createdAt);
					expect(result.get('expires')).to.equal(file.expires);
					expect(result.get('status')).to.equal(file.status);
					expect(result.get('error')).to.eql(file.error);
					done();
				})
				.catch(err => done(err));
		});

		it('can delete file records', done => {
			file.checksum = 'd41d8cd98f00b204e9800998ecf8427e';

			File.createAsync(file)
				.then(() => {
					return File.destroyAsync(
						file.checksum,
						file.format);
				})
				.then(() => {
					return File.getAsync(
						file.checksum,
						file.format);
				})
				.then(result => {
					expect(result).to.be.null;
					done();
				})
				.catch(err => done(err));
		});
	});

});
