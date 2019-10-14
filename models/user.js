const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const DocumentSchema = new mongoose.Schema({
  year: Number,
  month: Number,
  institution: String,
  importance: Number,
  description: String,
  filePath: String,
});

const UserSchema = new mongoose.Schema({
  username: String,
  password: String;
});


UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
