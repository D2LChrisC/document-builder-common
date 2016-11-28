import coveralls from 'gulp-coveralls';
import eslint from 'gulp-eslint';
import gulp from 'gulp';
import istanbul from 'gulp-istanbul';
import mocha from 'gulp-mocha';

const isparta = require('isparta');

gulp.task('lint', () => {
	return gulp
		.src(['src/**/*.js', 'tests/**/*.js'])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failOnError());
});

gulp.task('coverage', () => {
	return gulp
		.src(['src/**/*.js'])
		.pipe(istanbul({ instrumenter: isparta.Instrumenter }))
		.pipe(istanbul.hookRequire());
});

gulp.task('test', ['lint', 'coverage'], () => {
	return gulp
		.src('tests/**/*.tests.js')
		.pipe(mocha({ reporter: 'spec' }))
		.pipe(istanbul.writeReports({ reporters: [ 'lcov' ]}));
});

gulp.task('report-coverage', ['test'], () => {
	return gulp
		.src('coverage/lcov.info')
		.pipe(coveralls());
});
