const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcrypt');

// eslint-disable-next-line no-unused-vars
const DocumentSchema = new mongoose.Schema({
  year: Number,
  month: Number,
  institution: String,
  importance: Number,
  description: String,
  filePath: String,
});

const TodoSchema = new mongoose.Schema({
  title: String,
  date: Date,
});

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  todos: [TodoSchema],
  documents: [DocumentSchema],
  lastLoggedIn: String,
});

UserSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}


UserSchema.methods.isValid = (passwordToValidate, hashedPassword) => {
  return bcrypt.compareSync(passwordToValidate, hashedPassword);
  // bcrypt.compare(PasswordToValidate, User.password).then((result) => {
  //   if(result) {
  //     console.log("authentication successful");
  //     return true;
  //   } else {
  //     console.log("authentication failed. Password doesn't match");
  //     return false;
  //   }
  // }).catch((err) => console.error(err));
  // return false;
};

module.exports = {
  User: UserSchema,
  Documents: DocumentSchema,
  Todo: TodoSchema,
};
// module.exports = mongoose.model('User', UserSchema);
// module.exports = mongoose.model('Documents', DocumentSchema);
// module.exports = mongoose.model('Todo', TodoSchema);
