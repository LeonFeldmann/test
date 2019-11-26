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

app.post('/test', (req, res, next) => checkUsernameAndEmail(req, res, next), (req, res) => {

console.log("Success");
  res.send(200);

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


function checkUsernameAndEmail(req, res, next) {
  //console.log(req.body);
  let queryUsername = { "username": "/^" + req.body.username + "$/i" };
  User.findOne(queryUsername).then((result) => {
    console.log("This is the result: " + result);
    if (result == null) {
      let queryEmail = { "email": req.body.email };
      User.findOne(queryEmail).then((result) => {
      //console.log("This is the result: " + result);
        if (result == null) {
          next();
        } else {
          res.status(400).json({ "error": "This email address already exists in the database"});
          res.send();
        }
      });
    } else {
      res.status(400).json({ "error": "This username already exists in the database"});
      res.send();
    }
  });
}


app.post('/register', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['email', 'username', 'password']), (req, res, next) => checkUsernameAndEmail(req, res, next), (req, res) => {

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

app.post('/login', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['userIdentifier', 'password']), async (req, res) => {

    var firstQuery = await User.findOne({"username": req.body.userIdentifier}).exec();
    var secondQuery = await User.findOne({"email": req.body.userIdentifier}).exec();
    // console.log(firstQuery);
    // console.log(secondQuery);
  
     if (firstQuery && secondQuery == null && firstQuery.isValid(req.body.password, firstQuery.password)) {
        console.log('Valid password');
        const token = jwt.sign({ userID: firstQuery._id }, 'secret', { expiresIn: '3h' });
        //console.log(token);
         res.status(200).json({
          "loginStatus": "true",
          "token": token,
        });
     } else if (firstQuery == null && secondQuery && secondQuery.isValid(req.body.password, secondQuery.password)) {
        console.log('Valid password');
        const token = jwt.sign({ userID: secondQuery._id }, 'secret', { expiresIn: '3h' });
        //console.log(token);
         res.status(200).json({
          "loginStatus": "true",
          "token": token,
        });
     } else if (firstQuery !== null && secondQuery !== null) {
      res.status(404).json({
        "loginStatus": "false",
        "token": "",
        "error": "Please provide a unique identifier/use the other one"
      });
     } else {
      res.status(404).json({
        "loginStatus": "false",
        "token": "",
        "error": "Credentials not associated with an existing user"
      });
     }
     res.send();
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
function makedbEntry(user, yearvar, monthvar, institutionvar, importancevar, descriptionvar, titlevar, filePathvar, userIDvar) {
  console.log("in function");
  const doc = new Document({
    year: yearvar,
    month: monthvar,
    institution: institutionvar,
    importance: importancevar,
    description: descriptionvar,
    filePath: filePathvar,
    title: titlevar,
    userID: userIDvar,
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
function generateFilenameAndCopyFile(filePrefix, destinationDirectory) {
  fs.readdir(destinationDirectory, (err, files) => {
    if (err) {
      console.log(err);
      return false;
    }
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
        //console.log('Comparing ' + filename + ' to ' + newFilename);
        if (filename === newFilename) {
          //console.log('duplicate found');
          foundDuplicate = true;
        }
      });
      if (!foundDuplicate) {
        break;
      }
    }


    //console.log(newFilename);
    fs.copyFile('newFiles/ProblemSheet01.pdf', destinationDirectory + newFilename, (error) => {
      return new Promise((resolve, reject) => {
        if (error) {
          console.log(err);
          generatedFilename = false;
          reject(false);
        } else {
          //console.log('Success');
          //console.log(destinationDirectory + newFilename);
          generatedFilename = destinationDirectory + newFilename;
          resolve(destinationDirectory + newFilename);
        }
      });
    });
});
}

let currentFile = null;
let currentFileCount = 6;

// receive specifications after sending pdf
app.post('/currentDocumentData', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['year', 'month', 'institution', 'importance']), validateToken, async (req, res) => {
  const { year } = req.body;
  const { month } = req.body;
  const { institution } = req.body;
  const { importance } = req.body;
  const { description } = req.body;
  const { title } = req.body;
  const dirPath = './files/' + res.locals.user.username + '/';
  //const dirPath = './files/joja/';
  const filePrefix = year + '-' + month + '-' + institution + '-' + title;
  console.log("Current user is: " + res.locals.user.username);

  fs.readdir(dirPath, (err, files) => {
      if (err) {
        console.log(err);
    
      } else {
        //console.log(files);
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
            //console.log('Comparing ' + filename + ' to ' + newFilename);
            if (filename === newFilename) {
              //console.log('duplicate found');
              foundDuplicate = true;
            }
          });
          if (!foundDuplicate) {
            break;
          }
        }
        let generatedFilename = dirPath + newFilename;
        let newFilesDir = "./newFiles";
        console.log("Generated filename: " + generatedFilename);

        if (currentFile !== null) {
          fs.copyFile(newFilesDir + "/" + currentFile, generatedFilename, (error) => {  
            if (error) {
              console.log(err);
              res.status(500).json({ "error": "Error while moving the file"});
            } else {
              console.log('Success');
              //console.log(destinationDirectory + newFilename);
            }
          });
        }
      
              if (currentFileCount !== 0) {
                makedbEntry(res.locals.user, year, month, institution, importance, description, title, generatedFilename.substr(2), res.locals.user._id);
              }

              // delete old file
                console.log("Currentfile is: " + currentFile);
                 if(currentFile !== null) {
                //   fs.unlink(newFilesDir + "/" + currentFile);
                 }
                 if (currentFileCount !== 0) {
                  currentFileCount --;
                  console.log("New file count is: " + currentFileCount);
                 }


                // send next file
                fs.readdir(newFilesDir, (err, files) => {
                  // console.log("Reading ./newFiles");
                  // console.log(files.length);
                  if(err) {
                    console.log(err);
                  } else if (files.length == 0 || currentFileCount == 0) {
                    res.status(200).json({ "fileCount": 0});
                    currentFile = null;
                  } else {
                    //console.log(files[0]);
                    let index = 6 - currentFileCount;
                    let fileToSend = newFilesDir + '/' + files[index];
                    const stream = fs.createReadStream(fileToSend);
                    res.writeHead(200, {
                      'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(fileToSend))}'`,
                      'Content-type': 'application/pdf',
                      'Access-Control-Allow-Origin': '*',
                      'Access-Control-Allow-Methods': 'POST, GET',
                      'fileCount': files.length,
                      'Access-Control-Expose-Headers': '*',
                    });
                     stream.pipe(res);
                     currentFile = files[index];
                     console.log("new Currentfile is: " + currentFile);

                  }
                });
              }
    });
  
});


app.get('/importDocuments', validateToken, (req, res) => {
  const newFilesDir = './newFiles';
      // send next file
      fs.readdir(newFilesDir, (err, files) => {
        if(err) {
          console.log(err);
        } else if (files.length == 0) {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET',
            'Access-Control-Expose-Headers': '*',
            'fileCount': 0,
          });

          currentFile = null;
        } else {
          console.log(files[0]);
          let fileToSend = newFilesDir + '/' + files[0];
          const stream = fs.createReadStream(fileToSend);
          res.writeHead(200, {
            'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(fileToSend))}'`,
            'Content-type': 'application/pdf',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET',
            'fileCount': files.length,
            'Access-Control-Expose-Headers': '*',
          });
           stream.pipe(res);
           currentFile = files[0]
           console.log("new Currentfile is: " + currentFile);
           currentFileCount = 6;
           console.log("File count was reset to: " + currentFileCount);
        }
      });

  // fs.readdir(dir, (err, files) => {
  //   //  console.log(files.length);
  //   const body = `{ "numberOfFiles" : "${files.length}"}`;
  //   res.send(JSON.parse(body));
  // });

});


app.get('/institutions', validateToken, (req, res) => {
  res.send({ "institutions" : res.locals.user.institutions});
});

app.post('/createInstitution', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {

var query = {'_id':res.locals.user._id};
let newInstitution = req.body.institution;
let institutionsArray = res.locals.user.institutions;
let insitutionIsUnique = true;

institutionsArray.forEach(institution => {
  if (institution == newInstitution) {
    insitutionIsUnique = false;
  }
});

if (insitutionIsUnique) {
  institutionsArray.push(newInstitution);
  console.log(institutionsArray);
  User.findOneAndUpdate(query, { institutions: institutionsArray}, {upsert:false}, function(err, doc){
    if (err) {
     res.status(500).json({ "error": err });
    } else {
      res.status(200).json({"Message":"Institution \"" + newInstitution + "\" created and saved successfully"});
    }
  });
} else {
  res.status(400).json({"error": "Please enter a unique institution"});
}

 });

 app.post('/deleteInstitution', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {
  
  var query = {'_id':res.locals.user._id};
  let institutionToDelete = req.body.institution;
  let institutionsArray = res.locals.user.institutions;
  let institutionFound = false;
  let positionFound = null;
  
    for (let i = 0; i < institutionsArray.length; i++) 
    {
      console.log("Comparing "+ institutionsArray[i] + " to " + institutionToDelete);
      if (institutionsArray[i] == institutionToDelete) {
        institutionFound = true;
        positionFound = i;
        break;
      }
    }
  // console.log(institutionFound);
  // console.log(positionFound);
  if (institutionFound && positionFound !== null) {
    institutionsArray.splice(positionFound, 1);
    console.log(institutionsArray);
    console.log(res.locals.user.institutions);
    User.findOneAndUpdate(query, { institutions: institutionsArray}, {upsert:false}, function(err, doc){
       if (err) {
        res.status(500).json({ "error": err });
       } else {
        // delete institution from documents
        // get all docs with username ...
        let userQuery = {"userID": res.locals.user._id};
        Document.find(userQuery, function(err, docs) {
          if (err) {
            console.log("User has no documents");
          } else {
            console.log(docs);
            // get all docs with institution in array
            docs.forEach(doc => {
              let institutionsArray = doc.institution;
              let institutionFound = false;
              let positionFound = null;
              
                for (let i = 0; i < institutionsArray.length; i++) 
                {
                  console.log("Comparing "+ institutionsArray[i] + " to " + institutionToDelete);
                  if (institutionsArray[i] == institutionToDelete) {
                    institutionFound = true;
                    positionFound = i;
                    break;
                  }
                }
                if (institutionFound && positionFound !== null) {
                  institutionsArray.splice(positionFound, 1);
                  // replace
                  let query = {_id : doc._id};
                  Document.findOneAndUpdate(query, { institution: institutionsArray}, {upsert:false}, function(err, doc){
                    if (err)
                    console.log(err);
                  });
                }
            });
          }
        });
        res.status(200).json({"Message":"Institution " + institutionToDelete + " deleted successfully"});
      }
    });
        } else {
          res.status(400).json({ "error" : "Institution not existing in user"});
        }



 });

 app.post('/addInstitutionToDocument/:id', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {
  const { id } = req.params;
  Document.findById(id, 'institution', (err, document) => {
    if (err || document == null) {
      // console.log('Error getting document by id');
      res.status(404).json({ "error": "This id is not associated with any existing document"});
    } else {
      console.log(document);
      let institutionToAdd = req.body.institution;
      let institutionsArray = document.institution;
      let institutionFound = false;
  
      for (let i = 0; i < institutionsArray.length; i++) 
      {
        console.log("Comparing "+ institutionsArray[i] + " to " + institutionToAdd);
        if (institutionsArray[i] == institutionToAdd) {
          institutionFound = true;
          break;
        }
      }
      if (institutionFound) {
        res.status(400).json({"error" : "Institution already existing in document"});
      } else {
        var query = {'_id':id};
        institutionsArray.push(institutionToAdd);
        console.log(institutionsArray);
        Document.findOneAndUpdate(query, { institution: institutionsArray}, {upsert:false}, function(err, doc){
          if (err) {
            res.status(500).json({ "error": err });
           } else {
             console.log(doc);
            res.status(200).json({"Message":"Institution " + institutionToAdd + " added to document: " + id});
          }
        });
      }
    }

  });

});

app.post('/deleteInstitutionFromDocument/:id', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {

  const { id } = req.params;
  Document.findById(id, 'institution', (err, document) => {
    if (err) {
      // console.log('Error getting document by id');
      res.status(404).json({ "error": "This id is not associated with any existing document"});
    } else {
      console.log(document);
      let institutionToAdd = req.body.institution;
      let institutionsArray = document.institution;
      let institutionFound = false;
      let indexFound = null;
  
      for (let i = 0; i < institutionsArray.length; i++) 
      {
        console.log("Comparing "+ institutionsArray[i] + " to " + institutionToAdd);
        if (institutionsArray[i] == institutionToAdd) {
          institutionFound = true;
          indexFound = i;
          break;
        }
      }
      if (institutionFound && indexFound !== null) {

        institutionsArray.splice(indexFound, 1);
        var query = {'_id':id};
        Document.findOneAndUpdate(query, { institution: institutionsArray}, {upsert:false}, function(err, doc){
          if (err) {
            res.status(500).json({ "error" : err });
           } else {
             console.log(doc);
            res.status(200).json({ "Message" : "Institution " + institutionToAdd + " removed from document: " + id });
          }
        });

      } else {
        res.status(400).json({ "error" : "Institution not existing in document" });
      }
    }
  });
});


require('./app/routes')(app, {});

app.listen(port, () => {
  console.log(`The app listening on port: ${port}`);
});
