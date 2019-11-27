const mongoose = require('mongoose');


const DocumentSchema = new mongoose.Schema({
  year: Number,
  month: Number,
  institution: [],
  importance: Number,
  description: String,
  filePath: String,
  title: String,
  user: String,
});

module.exports = mongoose.model('Document', DocumentSchema);
