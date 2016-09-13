import Database from '../../data/database';
import { expect } from 'chai';

const db = new Database(
	'key',
	'secret',
	'us-east-1',
	'http://localhost:7777/');
const Conversion = db.Conversion;

function testValidation(item, failMessage, callback) {
	Conversion.createAsync(item)
		.then(() => callback(failMessage))
		.catch(err => {
			expect(err.cause.name).to.equal('ValidationError');
			callback();
		});
}

describe('Conversion class', () => {

	describe('validation', () => {

		let conversion = {};

		beforeEach(() => {
			const date = (new Date()).getTime();
			conversion = {
				fileId: 'my-file-xyz-123',
				format: 'raw',
				createdAt: date,
				lastTouched: date,
				checksum: 'aoewigh3240239r3rhf0m30fj0324',
				status: 'Complete',
				fileUri: 'https://wherever.s3.amazon.com/myfile/xyz/123/file.txt',
				error: {
					id: 'http://errors.brightspace.com/failure',
					title: 'Something happened',
					description: 'Aspose failed.'
				}
			};
		});

		it('prevents missing file ID', done => {
			conversion.fileId = undefined;
			testValidation(conversion, 'Conversion was saved without a File ID.', done);
		});

		it('prevents missing format', done => {
			conversion.format = undefined;
			testValidation(conversion, 'Conversion was saved without a Format.', done);
		});

		it('prevents invalid format', done => {
			conversion.format = 'xlsx';
			testValidation(conversion, 'Conversion was saved with an invalid format', done);
		});

		it('prevents missing created at date', done => {
			conversion.createdAt = undefined;
			testValidation(conversion, 'Conversion was saved without a Created At date.', done);
		});

		it('prevents non-numeric created at date', done => {
			conversion.createdAt = '2015-03-25T12:00:00';
			testValidation(conversion, 'Conversion was saved with a non-numeric Created At date.', done);
		});

		it('prevents missing last touched date', done => {
			conversion.lastTouched = undefined;
			testValidation(conversion, 'Conversion was saved without a Last Touched date.', done);
		});

		it('prevents non-numeric last touched date', done => {
			conversion.lastTouched = '2015-03-25T12:00:00';
			testValidation(conversion, 'Conversion was saved with a non-numeric Last Touched date.', done);
		});

		it('prevents missing status code', done => {
			conversion.status = undefined;
			testValidation(conversion, 'Conversion was saved without a Status.', done);
		});

		it('prevents invalid status code', done => {
			conversion.status = 'Waiting on coffee';
			testValidation(conversion, 'Conversion was saved with an invalid Status', done);
		});

		it('prevents invlaid file URI', done => {
			conversion.fileUri = 'this is definitely not a URI.';
			testValidation(conversion, 'Conversion was saved with an invalid file URI.', done);
		});

		it('prevents invalid error ID', done => {
			conversion.error.id = 'This is another bad URI.';
			testValidation(conversion, 'Conversion was saved with an invalid error ID.', done);
		});

	});

	describe('CRUD operations', () => {
		let conversion = {};

		beforeEach(() => {
			const date = (new Date()).getTime();

			conversion = {
				fileId: 'minimal-conversion-record',
				format: 'pdf',
				createdAt: date,
				lastTouched: date,
				status: 'Pending'
			};
		});

		afterEach(done => {
			Conversion.destroyAsync(conversion.fileId, conversion.format)
				.then(() => done())
				.catch(err => done(err));
		});

		it('can save a conversion item', done => {
			Conversion.createAsync(conversion)
				.then(() => {
					return Conversion.getAsync(
						conversion.fileId,
						conversion.format);
				})
				.then(result => {
					expect(result).to.exist;
					expect(result.get('fileId')).to.equal(conversion.fileId);
					expect(result.get('format')).to.equal(conversion.format);
					expect(result.get('createdAt')).to.equal(conversion.createdAt);
					expect(result.get('lastTouched')).to.equal(conversion.lastTouched);
					expect(result.get('status')).to.equal(conversion.status);
					done();
				})
				.catch(err => done(err));
		});

		it('can update existing conversions', done => {
			conversion.fileId = 'updatable-conversion-item';

			Conversion.createAsync(conversion)
				.then(() => {
					conversion.lastTouched = (new Date()).getTime();
					conversion.status = 'Complete';
					conversion.checksum = 'abc-12345';
					conversion.fileUri = 'https://myfile.s3.amazon.com/files/mystuff/file.pdf';
					conversion.error = {
						id: 'http://fail.com/error',
						title: 'Actually, everything worked.',
						description: 'All is well.'
					};

					return Conversion.updateAsync(conversion);
				})
				.then(() => {
					return Conversion.getAsync(
						conversion.fileId,
						conversion.format);
				})
				.then(result => {
					expect(result).to.exist;
					expect(result.get('fileId')).to.equal(conversion.fileId);
					expect(result.get('format')).to.equal(conversion.format);
					expect(result.get('createdAt')).to.equal(conversion.createdAt);
					expect(result.get('lastTouched')).to.equal(conversion.lastTouched);
					expect(result.get('status')).to.equal(conversion.status);
					expect(result.get('checksum')).to.equal(conversion.checksum);
					expect(result.get('fileUri')).to.equal(conversion.fileUri);
					expect(result.get('error')).to.eql(conversion.error);
					done();
				})
				.catch(err => done(err));
		});

		it('can delete conversions', done => {
			conversion.fileId = 'deleteable-conversion-item';

			Conversion.createAsync(conversion)
				.then(() => {
					return Conversion.destroyAsync(
						conversion.fileId,
						conversion.format);
				})
				.then(() => {
					return Conversion.getAsync(
						conversion.fileId,
						conversion.format);
				})
				.then(result => {
					expect(result).to.be.null;
					done();
				})
				.catch(err => done(err));
		});
	});

});
