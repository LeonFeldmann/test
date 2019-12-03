// gulpfile.js
var gulp = require('gulp');
var del = require('del');

var paths = {
  src: 'src/**/*',
  srcAPP: 'src/app/**/**',
  srcDATA: 'src/data/**/**',
  srcFILES: 'src/files',


  tmp: 'tmp',
  tmpAPP: 'tmp/app/**/**',
  tmpDATA: 'tmp/data/**/**',
  tmpFILES: 'tmp/files/**',

 

  dist: 'dist',
  distAPP: 'dist/app/**/**',
  distDATA: 'dist/data/**/**',
  distFILES: 'dist/files/**',

};

gulp.task('default', function (done) {
  console.log('Hello World!');
  done();
});

gulp.task('files', function (done) {
  gulp.src(paths.srcFILES).pipe(gulp.dest(paths.tmp));
  done();
});