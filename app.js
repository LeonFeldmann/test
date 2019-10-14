const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
// eslint-disable-next-line no-unused-vars
const mongo = require('mongodb').MongoClient;
const LocalStrategy = require('passport-local');
const mongoose = require('mongoose');
const User = require('./models/user');
const Document = require('./models/document');

const url = process.env.MONGODB_URI || 'mongodb://localhost/data';
const db = mongoose.connection;
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('we\'re connected!');
});


const app = express();
app.use(require('express-session')({
  secret: 'Anything at all',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json({ extended: true }));
const port = process.env.PORT || 3000;

passport.use(new LocalStrategy(User.authenticate()));
// reads and en/decodes the session
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// send pdf matching the id
app.get('/documentPDF/:id', (req, res) => {
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

app.get('/importDocuments', (req, res) => {
  const dir = './newFiles';
  fs.readdir(dir, (err, files) => {
    //  console.log(files.length);
    const body = `{ 'numberOfFiles' : '${files.length}'}`;
    res.send(JSON.parse(body));
  });
});


// send specs of all documents
app.get('/documents', async (req, res) => {
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
          // eslint-disable-next-line max-len
          // const docData = '{ \'year\' : ' + document.year + ', \'month\' : ' + document.month + ', \'institution\' : \'' + document.institution + '\', \'importance\' : ' + document.importance + ', \'description\' : \'' + document.description + '\',\'id\' : \'' + document._id.toString() + '\'}';
          // eslint-disable-next-line no-underscore-dangle
          const docData = `{ 'year' : ${document.year}, 'month' : ${document.month}, 'institution' : '${document.institution}', 'importance' : ${document.importance}, 'description' : '${document.description}','id' : '${document._id.toString()}'}`;
          documentInfo.push(docData);
        });

        resolve(documentInfo);
      }
    });
  });
    // .replace(/'/g,'')
  let data = '{ \'documentInfo\': [';
  let comma = '';
  for (let i = 0; i < infoArray.length; i + 1) {
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

// receive specifications after sending pdf and return with id
app.post('/currentDocumentData', (req, res) => {
  const { year } = req.body;
  const { month } = req.body;
  const { institution } = req.body;
  const { importance } = req.body;
  const { description } = req.body;
  const filePath = './files/otherExample.pdf';

  // console.log(req.body);
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
//
app.get('/document', (req, res) => {
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
