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


// copy src
// load dependencies
// execute tests
// start server

gulp.task('files', function (done) {
  gulp.src(paths.srcFILES).pipe(gulp.dest(paths.tmp));
  done();
});

gulp.task('clean', function () {
  del([paths.tmp, paths.dist]);
});

