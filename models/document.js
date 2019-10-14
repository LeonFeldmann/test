const mongoose = require('mongoose');


const DocumentSchema = new mongoose.Schema({
  year: Number,
  month: Number,
  institution: String,
  importance: Number,
  description: String,
  filePath: String,
});

module.exports = mongoose.model('Document', DocumentSchema);
