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
app.use(bodyParser.urlencoded({extended: true }));
const port = process.env.PORT || 3000;

passport.use(new LocalStrategy(User.authenticate()));
//reads and en/decodes the session
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// ==================
//       routes
// ==================

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



app.get('/document', function(req, res, next) {

  const filePath = './example.pdf';
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
      'Content-disposition': 'attachment; filename="' + encodeURIComponent(path.basename(filePath))  + '"',
      'Content-type': 'application/pdf',
  });
  res.send();
});

app.get('/document/:docId'), function(req, res) {

  // filter db for doc with docId
  // -> if found send doc
  // -> if not found send empty obj?

  res.send("This route is not implemented yet");
}







// catch 400
app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(400).send(`Error: ${res.originUrl} not found`);
    next();
});



require('./app/routes')(app, {});
app.listen(port, () => {
  console.log('The app listening on port: ' + port);
});

