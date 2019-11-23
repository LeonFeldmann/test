const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Schemata = require('./models/user');
const Document = require('./models/document');

const User = mongoose.model('user', Schemata.User);

const app = express();


const url = process.env.MONGODB_URI || 'mongodb://localhost/data';
const db = mongoose.connection;
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('we\'re connected!');
});


app.use(cors());
// if (process.env.PORT) {
//   app.use(cors({
//     origin: process.env.PORT
//   }));
// } else {
//   app.use(cors({
//     origin: 'http://localhost:3000'
//   }));
// }


app.use(require('express-session')({
  secret: 'Anything at all',
  resave: false,
  saveUninitialized: false,
}));


app.use(bodyParser.json({ extended: true }));
const port = process.env.PORT || 3000;


app.post('/creatDir', (req, res) => {
  fs.mkdir('./files/' + req.body.dir, { recursive: true }, (err) => {
    if (err) {
      console.log(err);
      res.status(400).json({ "error": "There was an error" });
    } else {
      res.status(200).json({ "message": "success" });
    }
  });
});

app.get('/deleteAllDirs', (req, res) => {
  fs.readdir('./files', (err, dirs) => {
    console.log(dirs);
    if (err) {
      res.status(400);
      return;
    }
    for (const dir of dirs) {
      fs.remove('./files/' + dir, (err) => {
        if (err) return console.error(err);
      });
    }
    res.send();
  });
});

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

app.get('/test', (req, res) => {
  // console.log(checkBodyForValidAttributes(req.body, ["number", "text", "extra"]));
  // res.send();
  // console.log("This still got executed");
  // return;
  const stream = fs.createReadStream("files/jojo/2006-4-court.pdf");

});


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

function checkAttributeForUniqueness(query) {
  User.findOne(query).then((result) => {
    if (result) {
      return false;
    } else {
      return true;
    }
  });
}


app.post('/register', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['email', 'username', 'password']), (req, res) => {

  // if (!checkAttributeForUniqueness({ "username": req.body.username})) {
  //   res.status(400).json({ "error": "This username already exists in the database"});
  //   res.send();
  //   return;
  // } else if (!checkAttributeForUniqueness({ "email": req.body.email})) { 
  //   res.status(400).json({ "error": "This email address already exists in the database"});
  //   res.send();
  //   return;
  // }


  console.log("This should not get printed");
  const newUser = new User({
    email: req.body.email,
    username: req.body.username,
    password: User.hashPassword(req.body.password),
    todos: {},
    institutions: ['other'],
    lastLoggedIn: new Date(),
  });
  const promise = newUser.save();
  console.log(newUser);

  promise.then((doc) => {
    fs.mkdir(`./files/${req.body.username}`, { recursive: true }, (err) => {
      if (err) console.log(err);
    });
    res.status(201).json(doc);
  });
  promise.catch((err) => res.status(500).json({ message: 'Error registering user.', error: err }));
});


app.post('/login', async (req, res) => {
  let identifier;
  if (req.body.hasOwnProperty('username') && req.body.username !== '') {
    // eslint-disable-next-line quotes
    identifier = {"username": req.body.username};
  } else if (req.body.hasOwnProperty('email') && req.body.email !== '') {
    identifier = { "email": req.body.email };
  } else {
    res.status(401).json({ "error": "You must provide either a vaild username or emailaddress"});
  }
  const promise = User.findOne(identifier).exec();

  promise.then((user) => {
    console.log(user);
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
      res.status(404).json({
        "loginStatus": "false",
        "token": "",
        "error": "Login credentials wrong"

      });
    }
  });
  promise.catch(() => {
    return res.status(404).json({
      "loginStatus": "false",
      "token": "",
      "error": "Username not associated with an existing user"
    });
  });
});


// send pdf matching the id
app.get('/documentPDF/:id', validateToken, (req, res) => {
  const { id } = req.params;
  Document.findById(id, 'filePath', (err, document) => {
    if (err) {
      // console.log('Error getting document by id');
      res.status(404).json({ "error": "This id is not associated with any existing document"});
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


// send specs of all documents
app.get('/documents', validateToken, async (req, res) => {
  console.log(res.locals.user);
  // promise to get all entrys from db and add them to an array, then merge to json obj
  const infoArray = await new Promise((resolve, reject) => {
    Document.find({}, (err, documents) => {
      if (err) {
        res.status(500).json({ "error": "While getting the documents info the following error occured: " + err});
        reject(err);
        //console.log('Error finding documents');
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
/**
 * @param  {} user
 * @param  {} yearvar
 * @param  {} monthvar
 * @param  {} institutionvar
 * @param  {} importancevar
 * @param  {} descriptionvar
 * @param  {} filePathvar
 */
function makedbEntry(user, yearvar, monthvar, institutionvar, importancevar, descriptionvar, titlevar, filePathvar) {
  const doc = new Document({
    year: yearvar,
    month: monthvar,
    institution: institutionvar,
    importance: importancevar,
    description: descriptionvar,
    filePath: filePathvar,
    title: titlevar,
  });
  //console.log(user);
  console.log(filePathvar);
  doc.save((err, document) => {
    if (err) {
      console.log('Error adding to DB');
      res.status(500).json({ "error": "While writing the entry to the db the following error occured: " + err});
    } else {
      console.log('Successfully saved doc to db');
    }
    console.log(document);
  });
}


/**
 * This function creates a unique filename by concatenating document metainformation
 * with the original filename and if needed with an id.
 * Then the file gets copied from the newFiles directory to the destinationDirectory
 * and the old file is deleted.
 * @param  {string} filePrefix
 * @param  {string} destinationDirectory
 */
function createFilenameAndCopyFile(filePrefix, destinationDirectory) {
  fs.readdir(destinationDirectory, (err, files) => {
    if (err) {return false;}
    console.log(files);

    let newFilename = filePrefix + '.pdf';
    let foundDuplicate = false;
    for(let a = 0; a < 1000; a++) {
      foundDuplicate = false;
      //newFilename = filePrefix + '.pdf';
      if(a > 0) {
        newFilename = filePrefix + a + '.pdf';
      }
      // eslint-disable-next-line no-loop-func
      files.forEach(filename => {
        console.log('Comparing ' + filename + ' to ' + newFilename);
        if (filename === newFilename) {
          console.log('duplicate found');
          foundDuplicate = true;
        }
      });
      if (!foundDuplicate) {
        break;
      }
    }
    console.log(newFilename);
    fs.copyFile('newFiles/ProblemSheet01.pdf', destinationDirectory + newFilename, (error) => {

      if (error) {
        console.log(err);
        return false;
      } else {
        console.log('Success');
        console.log(destinationDirectory + newFilename);
        return destinationDirectory + newFilename;
      }
    });
});
}


// receive specifications after sending pdf
app.post('/currentDocumentData', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['year', 'month', 'institution', 'importance']), validateToken, (req, res) => {
  const { year } = req.body;
  const { month } = req.body;
  const { institution } = req.body;
  const { importance } = req.body;
  const { description } = req.body;
  const { title } = req.body;
  const dirPath = './files/' + res.locals.user.username + '/';
  const filePrefix = year + '-' + month + '-' + institution;
  //const filePath = createFilenameAndCopyFile(filePrefix, dirPath);
  const filePath = 'files/jojo/' + filePrefix + '.pdf';
  console.log(filePath);
  // if (filePath) {
  //   res.status(500).json({ "error": "Error while moving the file"});
  //   res.send();
  //   return;
  // }

  // eslint-disable-next-line no-prototype-builtins
  if (req.body.hasOwnProperty('year') && req.body.hasOwnProperty('month') && req.body.hasOwnProperty('institution') && req.body.hasOwnProperty('importance') && req.body.hasOwnProperty('description')) {
    if (year != null && month != null && institution !== '' && importance != null) {
      makedbEntry(res.locals.user, year, month, institution, importance, description, title, filePath);
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET',
      });
    } else {
      res.status(400).json({ "error": "Mandatory attributes must be non-null or non-empty"});
    }
  } else {
    res.status(400).json({ "error": "Request does not have the specified attributes"});
  }
  res.send();
});

app.get('/importDocuments', validateToken, (req, res) => {
  const dir = './newFiles';
  fs.readdir(dir, (err, files) => {
    //  console.log(files.length);
    const body = `{ "numberOfFiles" : "${files.length}"}`;
    res.send(JSON.parse(body));
  });
});


app.get('/institutions', validateToken, (req, res) => {
  res.send({ "institutions" : res.locals.user.institutions});
});

app.post('/createInstitution', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {
//   console.log(res.locals.user._id);
//   User.update(
//     { _id: res.locals.user._id },
//     { institutions: 'test' }
// );
//User.update({_id:res.locals.user._id}, 
//{$set: {institutions: ["test"] }});

var query = {'_id':res.locals.user._id};
User.findOneAndUpdate(query, { institutions: ["test"]}, {upsert:false}, function(err, doc){
    if (err) return res.send(500, { error: err });
    return res.send("succesfully saved");
});
  // res.locals.user.update(
});

require('./app/routes')(app, {});

app.listen(port, () => {
  console.log(`The app listening on port: ${port}`);
});
