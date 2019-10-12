var mongoose = require("mongoose");


var DocumentSchema = new mongoose.Schema({
    year: String,
    month: String,
    institution: String,
    filePath: String
});


module.exports = mongoose.model("Document", DocumentSchema);