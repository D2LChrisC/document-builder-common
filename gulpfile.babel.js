import eslint from 'gulp-eslint';
import gulp from 'gulp';
import mocha from 'gulp-mocha';

gulp.task('lint', () => {
	return gulp
		.src(['util/**/*.js', 'tests/**/*.js', 'util.js'])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failOnError());
});

gulp.task('test', ['lint'], () => {
	return gulp
		.src('tests/**/*.tests.js')
		.pipe(mocha({ reporter: 'spec' }));
});
