// gulpfile.js
var gulp = require('gulp');
var del = require('del');
var nodemon = require('nodemon');
var exec = require('child_process').exec;
var child_process = require('child_process');

var paths = {
  src: 'src/**/*',
  srcAPP: 'src/*app/**/*',
  srcDATA: 'src/*data',
  srcDATALOGS: 'src/data/*logs',
  srcFILES: 'src/files',
  srcNEWFILES: 'src/*newFiles/**/*',
  srcMODELS: 'src/*models/*',
  srcAPPJS: 'src/app.js',
  srcDEFAULTS: 'src/*defaults/**/*',
  srcPACKAGEJSON: 'src/package.json',
  srcMONGOCONFIG: 'src/mongod.conf',
  dbDir: 'tmp/data',
  dbLogs: 'tmp/data/logs',


  tmp: 'tmp',
  tmpAPP: 'tmp/*app/**/*',
  tmpDATA: 'tmp/data',
  tmpFILES: 'tmp/files',
  tmpNEWFILES: 'tmp/*newFiles/**/*',
  tmpMODELS: 'tmp/*models/*',
  tmpAPPJS: 'tmp/app.js',
  tmpDEFAULTS: 'tmp/*defaults/**/*',
  tmpPACKAGEJSON: 'tmp/package.json',
  tmpMONGOCONFIG: 'tmp/mongod.conf',

 

  dest: 'dest',
  destAPP: 'dest/*app/**/*',
  destDATA: 'dest/*data',
  destFILES: 'dest/files',
  destNEWFILES: 'dest/*newFiles/**/*',
  destMODELS: 'dest/*models/**/*',
  destAPPJS: 'dest/app.js',
  destDEFAULTS: '*dest/defaults/**/*',
  destPACKAGEJSON: 'dest/package.json',
  destMONGOCONFIG: 'dest/mongod.conf'


};

// copy src
// load dependencies
// execute tests
// start server

var currentFolder = 'tmp';
var processes = {server: null, mongo : null};

gulp.task('start:server', function (cb) {
  // The magic happens here ...
  processes.server = nodemon({
      script: "app.js",
      ext: "js"
  });
  cb();
});

paths.dbDir = currentFolder + '/data';
paths.dbLogs = currentFolder + '/data/logs';
gulp.task('start:mongo', function (cb) {
  //processes.mongo = child_process.exec('mongod --config /Users/leonfeldmann/Desktop/WebFileViewerProject/src/mongod.conf', function (err, stdout, stderr) {});
  
  processes.mongo = child_process.exec('mongod --dbpath data/ --logpath data/logs/mongo.log', function (err, stdout, stderr) {});

  cb();
});




// process.on('exit', function () {
//   processes.server.kill();
//   processes.mongo.kill();
// });



// function runCommand(command) {
//   return function (cb) {
//     exec(command, function (err, stdout, stderr) {
//       console.log(stdout);
//       console.log(stderr);
//       cb(err);
//     });
//   };
// }

//gulp.task('run', gulp.parallel('start:mongo', 'start:server'));
gulp.task('run', gulp.series('start:mongo', 'start:server'));



