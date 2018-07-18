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

function test() {
	return gulp
		.src('tests/**/*.tests.js')
		.pipe(mocha({
			reporter: 'spec',
			timeout: 5000,
			compilers: 'js:babel-register'
		}))
		.pipe(istanbul.writeReports({ reporters: [ 'lcov' ]}));
}

function reportCoverage() {
	return gulp
		.src('coverage/lcov.info')
		.pipe(coveralls());
}

gulp.task('lint', lint);

gulp.task('coverage', coverage);

gulp.task('test', gulp.series('lint', 'coverage', test));

gulp.task('report-coverage', gulp.series('test', reportCoverage));
