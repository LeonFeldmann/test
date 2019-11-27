const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
// eslint-disable-next-line no-unused-vars

const TodoSchema = new mongoose.Schema({
  title: String,
  marked: Boolean,
  user: String,
});



const UserSchema = new mongoose.Schema({
  email: String,
  username: String,
  firstName: String,
  lastName: String,
  password: String,
  institutions: [],
  lastLoggedIn: String,
  picture: String,
});

UserSchema.statics.hashPassword = function (password) {
  return bcrypt.hashSync(password, 10);
};


UserSchema.methods.isValid = function (passwordToValidate, hashedPassword) {
  return bcrypt.compareSync(passwordToValidate, hashedPassword);
};

module.exports = {
  User: UserSchema,
  Todo: TodoSchema,
};
