import coveralls from 'gulp-coveralls';
import eslint from 'gulp-eslint';
import gulp from 'gulp';
import istanbul from 'gulp-istanbul';
import mocha from 'gulp-mocha';

const isparta = require('isparta');

function lint() {
	return gulp
		.src(['src/**/*.js', 'tests/**/*.js'])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failOnError());
}

function coverage() {
	return gulp
		.src(['src/**/*.js'])
		.pipe(istanbul({ instrumenter: isparta.Instrumenter }))
		.pipe(istanbul.hookRequire());
}

gulp.task('lint', lint);

gulp.task('coverage', coverage);

gulp.task('test', gulp.series('lint', 'coverage', () => {
	return gulp
		.src('tests/**/*.tests.js')
		.pipe(mocha({
			reporter: 'spec',
			timeout: 5000,
			compilers: 'js:babel-core/register'
		}))
		.pipe(istanbul.writeReports({ reporters: [ 'lcov' ]}));
}));

gulp.task('report-coverage', gulp.series('test', () => {
	return gulp
		.src('coverage/lcov.info')
		.pipe(coveralls());
}));
