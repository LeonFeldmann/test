const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
// eslint-disable-next-line no-unused-vars
const mongo = require('mongodb').MongoClient;
const mongoose = require('mongoose');
// eslint-disable-next-line no-unused-vars
// const UserSchema = require('./models/user');
const Schemata = require('./models/user');
const Document = require('./models/document');
const User = mongoose.model('user', Schemata.User);
const jwt = require('jsonwebtoken');

const app = express();


const url = process.env.MONGODB_URI || 'mongodb://localhost/data';
const db = mongoose.connection;
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('we\'re connected!'); // undefined
});


const cors = require('cors');
if (process.env.PORT) {
  app.use(cors({
    origin: process.env.PORT
  }));
} else {
  app.use(cors({
    origin: 'http://localhost:3000'
  }));
}


app.use(require('express-session')({
  secret: 'Anything at all',
  resave: false,
  saveUninitialized: false,
}));


app.use(bodyParser.json({ extended: true }));
const port = process.env.PORT || 3000;


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

app.post('/register', (req, res) => {
  const newUser = new User({
    email: req.body.email,
    username: req.body.username,
    password: User.hashPassword(req.body.password),
    todos: {},
    documents: {},
    lastLoggedIn: new Date(),
  });
  const promise = newUser.save();
  console.log(newUser);

  promise.then((doc) => res.status(201).json(doc));
  promise.catch((err) => res.status(501).json({ message: 'Error registering user.', error: err }));
});


app.post('/login', async (req, res) => {
  const promise = User.findOne({ username: req.body.username }).exec();
  promise.then((user) => {
    if (user && user.isValid(req.body.password, user.password)) {
      console.log('Valid password');
      const token = jwt.sign({ userID: user._id }, 'secret', { expiresIn: '3h' });
      console.log(token);
      return res.status(200).json({
        "loginStatus": "true",
        "token": token,
      });
    // eslint-disable-next-line no-else-return
    } else {
      res.status(501).json({
        "loginStatus": "false",
        "token": ""
      });
    }
  });
  promise.catch(() => {
    return res.status(501).json({
      "loginStatus": "false",
      "token": ""
    });
  });
});


// send pdf matching the id
app.get('/documentPDF/:id', validateToken, (req, res) => {
  const { id } = req.params;
  Document.findById(id, 'filePath', (err, document) => {
    if (err) {
      console.log('Error getting document by id');
      res.statusCode = 404;
      res.send();
    } else {
      const stream = fs.createReadStream(document.filePath);
      res.writeHead(200, {
        'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(document.filePath))}'`,
        'Content-type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET',
      });
      stream.pipe(res);
    }
  });
});

app.get('/importDocuments', validateToken, (req, res) => {
  const dir = './newFiles';
  fs.readdir(dir, (err, files) => {
    //  console.log(files.length);
    const body = `{ "numberOfFiles" : "${files.length}"}`;
    res.send(JSON.parse(body));
  });
});


// send specs of all documents
app.get('/documents', validateToken, async (req, res) => {
  console.log(res.locals.user);
  // promise to get all entrys from db and add them to an array, then merge to json obj
  const infoArray = await new Promise((resolve, reject) => {
    Document.find({}, (err, documents) => {
      if (err) {
        reject(err);
        console.log('Error finding documents');
      } else {
        const documentInfo = [];
        // eslint-disable-next-line array-callback-return
        documents.map((document) => {
          // eslint-disable-next-line no-underscore-dangle
          const docData = `{ "year" : "${document.year}", "month" : "${document.month}", "institution" : "${document.institution}", "importance" : "${document.importance}", "description" : "${document.description}","id" : "${document._id.toString()}"}`;
          documentInfo.push(docData);
        });

        resolve(documentInfo);
      }
    });
  });
    // .replace(/'/g,'')
  let data = '{ "documentInfo": [';
  let comma = '';
  console.log(infoArray.length);
  for (let i = 0; i < infoArray.length; i++) {
    if (i > 0) {
      comma = ',';
    }
    data = data + comma + infoArray[i];
  }
  data += ']}';

  const body = JSON.parse(data);
  // console.log(data);

  res.statusCode = 200;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');

  res.send(body);
});


// eslint-disable-next-line max-len
function makedbEntry(yearvar, monthvar, institutionvar, importancevar, descriptionvar, filePathvar) {
  const doc = new Document({
    year: yearvar,
    month: monthvar,
    institution: institutionvar,
    importance: importancevar,
    description: descriptionvar,
    filePath: filePathvar,
  });
  doc.save((err, document) => {
    if (err) {
      console.log('Error adding to DB');
    } else {
      console.log('Successfully saved doc to db');
    }
    console.log(document);
  });
}

// receive specifications after sending pdf
app.post('/currentDocumentData', validateToken, (req, res) => {
  const { year } = req.body;
  const { month } = req.body;
  const { institution } = req.body;
  const { importance } = req.body;
  const { description } = req.body;
  const filePath = './files/otherExample.pdf';

  // eslint-disable-next-line no-prototype-builtins
  if (req.body.hasOwnProperty('year') && req.body.hasOwnProperty('month') && req.body.hasOwnProperty('institution') && req.body.hasOwnProperty('importance') && req.body.hasOwnProperty('description')) {
    if (year != null && month != null && institution !== '' && importance != null) {
      makedbEntry(year, month, institution, importance, description, filePath);
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET',
      });
    } else {
      res.statusCode = 400;
    }
  } else {
    res.statusCode = 400;
  }
  res.send();
});


// Getting a PDF file from the server via HTTP POST (streaming version).
app.get('/document', validateToken, (req, res) => {
  const filePath = './example.pdf';
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(filePath))}'`,
    'Content-type': 'application/pdf',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET',
  });
  stream.pipe(res);
});


require('./app/routes')(app, {});

app.listen(port, () => {
  console.log(`The app listening on port: ${port}`);
});
