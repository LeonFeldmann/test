const bodyParser  = require('body-parser');
const cors        = require('cors');
const express     = require('express');
const fs          = require('fs-extra');
const jwt         = require('jsonwebtoken');
const merge       = require('easy-pdf-merge');
const mongoose    = require('mongoose');
const multer      = require('multer');
const path        = require('path');

const Schemata    = require('./models/user');
const Document    = require('./models/document');
const User        = mongoose.model('user', Schemata.User);
const Todo        = mongoose.model('todo', Schemata.Todo);

const upload = multer({dest: "newFiles"});
const port = process.env.PORT || 3000;

const app = express();
const currentDir = './src';

const url = process.env.MONGODB_URI || 'mongodb://localhost/data';
const db = mongoose.connection;
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useFindAndModify', false);
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('we\'re connected!');
});

app.use(cors());
app.use(bodyParser.json({ extended: true }));

app.use(require('express-session')({
  secret: 'Anything at all',
  resave: false,
  saveUninitialized: false,
}));

require('./app/routes/institution_routes')(app, validateToken, checkBodyForValidAttributes, currentDir);
require('./app/routes/todo_routes')(app, validateToken, checkBodyForValidAttributes, currentDir);
require('./app/routes/user_routes')(app, validateToken, checkBodyForValidAttributes, currentDir);
require('./app/routes/document_routes')(app, validateToken, checkBodyForValidAttributes, currentDir);


/**
 * @param  {} body
 * @param  {} attributes
 */
function checkBodyForValidAttributes(req, res, next, attributes) {
  let requestWellComposed = true;
  //console.log(attributes);
  for (let i = 0; i < attributes.length; i++) {
    if (!req.body.hasOwnProperty(attributes[i]) || req.body[attributes[i]] == null || req.body[attributes[i]] === '') {
      requestWellComposed = false;
      break;
    }
  }
  //console.log("At the end of check function: " + requestWellFormulated);
  if (requestWellComposed) {
    next();
  } else {
    res.status(400).json({ "error": "Required parameters in request body either not existing or undefined/empty" });
    res.send();
  }
  }

// make sure filestructure exists after server restart 
//(empty folders not tracked by git & stuff...)
function initializeDirectoriesOnServer() {
  // make sure files folder is set up
  if (fs.existsSync(currentDir + '/files/')) {
    console.log("Files folder aready existing");
} else {
  fs.mkdir(currentDir + '/files/', { recursive: true }, (err) => {
    if (err) console.log(err);
  });
  console.log("Files folder created");

  // create user folder
User.find({}, function(err, res) {
  console.log(res);
  if (res.length > 0) {
    res.forEach(user => {
      fs.mkdir(currentDir + `/files/${user.username}`, { recursive: true }, (err) => {
        if (err) {
          console.log(err);
        } else {
          fs.copyFile("picture.png", currentDir + '/files/' + user.username + '/picture.png');
        }
      });      
    });
    console.log("Initialized user directories with picture");
  }
});
}
currentFileCount = 0;
}

/**
 * @param  {} req
 * @param  {} res
 * @param  {} next
 */
// eslint-disable-next-line consistent-return
function validateToken(req, res, next) {
 
    const token = req.headers['x-access-token'];
  if (!token) return res.status(401).send({ auth: false, message: 'No token provided' });
  // eslint-disable-next-line consistent-return
  jwt.verify(token, 'secret', (err, decoded) => {
    if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token' });

    // eslint-disable-next-line consistent-return
    User.findById(decoded.userID, (error, user) => {
      if (error) return res.status(500).send('There was a problem finding the user.');
      if (!user) return res.status(404).send('No user found.');
      res.locals.user = user;
      next();
    });
  });



}



app.post('/test', (req, res) => {
  let dir = currentDir + '/files/';


  fs.readdir(dir, (err, files) => {
    if (err) {
      console.log(err);
    } else {
      files.forEach(file => {
        console.log(file);
      });
    }
  });

    res.sendStatus(200);
  });

app.post('/testAll', (req, res) => {
    let dir = currentDir;
    fs.readdir(dir, (err, files) => {
      if (err) {
        console.log(err);
      } else {
        files.forEach(file => {
          console.log(file);
        });
      }
    });
  
      res.sendStatus(200);
});

app.post('/testUser', validateToken, (req, res) => {
  let dir = currentDir + '/files/' + res.locals.user.username;
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.log(err);
    } else {
      files.forEach(file => {
        console.log(file);
      });
    }
  });

    res.sendStatus(200);
});












app.listen(port, () => {
  initializeDirectoriesOnServer();
  console.log(`The app is listening on port: ${port}`);
});
