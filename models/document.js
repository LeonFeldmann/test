var mongoose = require("mongoose");


var DocumentSchema = new mongoose.Schema({
    id: String,
    date: String,
    institution: String,
    filePath: String,
    userID: String
});


module.exports = mongoose.model("Document", DocumentSchema);