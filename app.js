var express     = require('express'),
    bodyParser  = require('body-parser'),
    fs          = require('fs'),
    path        = require('path'),
    passport    = require("passport"),
    mongo        = require("mongodb").MongoClient,
    LocalStrategy = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose");
var mongoose      = require("mongoose");
var User          = require("./models/user");
var Document      = require("./models/document");

var url = process.env.MONGODB_URI || "mongodb://localhost/data";
mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});



var app =  express();
app.set('view engine', 'ejs');
app.use(require("express-session")({
  secret: "Anything at all",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json({extended: true }));
const port = process.env.PORT || 3000;

passport.use(new LocalStrategy(User.authenticate()));
//reads and en/decodes the session
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




// ====================================================================
app.get('/', (req, res) => res.render('homepage'));
// login/logout
app.get("/login", function(req, res){
res.render("login");
});
app.post("/login", passport.authenticate("local", {
  successRedirect: "/logged",
  failureRedirect: "/login"
}), function(req, res){
});
app.get("/logout", function(req, res){
  req.logOut();
  res.redirect("/");
});
//middelware: check login status, if not logged in redirect to /login
function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/login");
}
// show signup form
app.get('/register', function(req, res){
  res.render("register");
});
// handling user sign up
app.post("/register", function(req, res){
  req.body.username
  req.body.password
  User.register(new User({username: req.body.username}), req.body.password, function(err, user){
    if(err){
      console.log(err);
      return res.render("register");
    }
    passport.authenticate("local")(req, res, function(){
      res.redirect("/logged");
    });
  });
});
app.get("/logged", isLoggedIn, function(req, res){
res.send("This is content for logged users");
});





 // receive specifications after sending pdf and return with id
 app.post('/document', (req, res) => {
  var date = req.body.date;
  var institution = req.body.institution;
  console.log(req.body);

  if(req.body.hasOwnProperty('date') && req.body.hasOwnProperty('institution') && date != "" && institution != ""){
    res.statusCode = 200;    
  } else {
    res.statusCode = 400;    
  }
  res.send();
});


// send specs of all documents
app.get("/documents", async function (req, res) {

  // promise to get all entrys from db and add them to an array, then merge to json obj
  var infoArray = await new Promise((resolve, reject) => {
    Document.find({} , (err, documents) => {
      if(err) {
        reject(err);
        console.log("Error findng documents");
      } else {
        var documentInfo = [];
        documents.map(document => {
        
        var docData = "{ year: " + document.year + ",month: " + document.month + ",institution: " + document.institution + ",id: " + document._id.toString() + "}";
        documentInfo.push(docData);

      })
    
      resolve(documentInfo);
      }
    })
  });
    
  var data = "{ \"documentInfo\":\"" + JSON.stringify(infoArray).replace(/"/g,"") + "\"}";
  var data = JSON.parse(data);
  //console.log(data);

  res.send(data);
  
});





// receive specifications after sending pdf and return with id
app.post('/dbEntry', (req, res) => {
  var year = req.body.year;
  var month = req.body.month;
  var institution = req.body.institution;
  var filePath = "files/Example.pdf";

  // console.log(req.body);
  if(req.body.hasOwnProperty('year') && req.body.hasOwnProperty('month') && req.body.hasOwnProperty('institution') && year != "" && month != "" && institution != ""){
    makedbEntry(year, month, institution, filePath);
    res.statusCode = 200;    
  } else {
    res.statusCode = 400;    
  }
  res.send();
});


function makedbEntry(yearvar, monthvar, institutionvar, filePathvar) {
    var doc = new Document({
      year: yearvar,
      month: monthvar,
      institution: institutionvar,
      filePath: filePathvar
    });
    // var doc = new Document({
    //   date: "02/2019",
    //   institution: "tax office",
    //   filePath: "files/example.pdf"
    // });
    doc.save(function(err, document){
      if(err) {
        console.log("Error adding to DB");
      } else {
        console.log("Successfully saved doc to db");
      }
      console.log(document);
    });
}



// Getting a PDF file from the server via HTTP POST (streaming version).
//
app.get('/document', function(req, res, next) {

  const filePath = './example.pdf';
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
      'Content-disposition': 'attachment; filename="' + encodeURIComponent(path.basename(filePath))  + '"',
      'Content-type': 'application/pdf',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET'
  });
  stream.pipe(res);
});


require('./app/routes')(app, {});
app.listen(port, () => {
  console.log('The app listening on port: ' + port);
});

