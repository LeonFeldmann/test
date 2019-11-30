const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const merge = require('easy-pdf-merge');

// const formData = require("express-form-data");
// const os = require("os");
const formidable = require("formidable");
const http = require('http');
const util = require('util');

const Schemata = require('./models/user');
const Document = require('./models/document');


const User = mongoose.model('user', Schemata.User);
const Todo = mongoose.model('todo', Schemata.Todo);

const app = express();
let form = new formidable.IncomingForm();
form.uploadDir = "./files";
form.keepExtensions = true;

const url = process.env.MONGODB_URI || 'mongodb://localhost/data';
const db = mongoose.connection;
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useFindAndModify', false);
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

// app.use(formData.format());
// app.use(formData.stream());
// app.use(formData.union());


app.use(require('express-session')({
  secret: 'Anything at all',
  resave: false,
  saveUninitialized: false,
}));


app.use(bodyParser.json({ extended: true }));
const port = process.env.PORT || 3000;


let mergedFileToEdit = false;
app.post('/mergePDFs', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['year', 'month', 'institution', 'importance']), async (req, res) => {
  
  if (req.body.hasOwnProperty('pdfArray') && Array.isArray(req.body.pdfArray) && req.body.pdfArray.length >= 2) {
    
    const { year } = req.body;
    const { month } = req.body;
    const { institution } = req.body;
    const { importance } = req.body;
    const { description } = req.body;
    const { title } = req.body;
    const dirPath = './files/' + res.locals.user.username + '/';
    const filePrefix = year + '-' + month + '-' + institution + '-' + title;
    console.log("Current user is: " + res.locals.user.username);
  
    // getting pdf array
    let pdfIDArray = req.body.pdfArray;
    let pdfArray = [];
    let idsAreValid = true;

    // check input array and create filePath array
    for (let i = 0; i < pdfIDArray.length; i ++) {
      if (!mongoose.Types.ObjectId.isValid(pdfIDArray[i])) {
        idsAreValid = false;
        break;
      } else {
        let file = await Document.findOne({"_id": pdfIDArray[i]}).exec();
        if (file == null) {
          idsAreValid = false;
          break;
        }
        pdfArray.push(file.filePath);
      }

    }

    if (idsAreValid) {

    // merging the pdfs
      merge(pdfArray, "newFiles/newMergedPDF.pdf" , function(err) {
      if (err) {
        console.log(err);
        res.status(500).json({"error" : "Error merging pdfs"});
        return;
      } else {
      console.log("successfully merge pdfs");

      deleteDocumentsFromDB(pdfIDArray);
      deleteDocumentsFromFS(pdfArray);

      // generate new filename
      // fs.readdir(dirPath, (err, files) => {
      //   if (err) {
      //     console.log(err);
      //   } else {
      //     //console.log(files);
      //     let newFilename = filePrefix + '.pdf';
      //     let foundDuplicate = false;
      //     for(let a = 0; a < 1000; a++) {
      //       foundDuplicate = false;
      //       //newFilename = filePrefix + '.pdf';
      //       if(a > 0) {
      //         newFilename = filePrefix + a + '.pdf';
      //       }
      //       // eslint-disable-next-line no-loop-func
      //       files.forEach(filename => {
      //       //console.log('Comparing ' + filename + ' to ' + newFilename);
      //         if (filename === newFilename) {
      //           //console.log('duplicate found');
      //           foundDuplicate = true;
      //         }
      //       });
      //       if (!foundDuplicate) {
      //         break;
      //       }
      //     }
      //     let generatedFilename = dirPath + newFilename;
      //     console.log("The old generatedFilename is: " + generatedFilename);
          let generatedFilename = generateFilename(dirPath, filePrefix);
          //console.log(result);

      // write new file in db
      makedbEntry(res.locals.user, year, month, institution, importance, description, title, generatedFilename.substr(2), res.locals.user._id);

      // move new file to fs
      fs.copyFile("./newFiles/newMergedPDF.pdf", generatedFilename, (error) => {  
        if (error) {
          console.log(err);
        } else {
          console.log('Success');
        }
        fs.remove('./newFiles/newMergedPDF.pdf', (err) => {
          if (err) {
            console.error(err);
            return;
            }
          });
        });
      }

    });

        res.sendStatus(200);
      
    } else {
      res.status(400).json({"error" : "Please use valid document ids"});
    }
  } else {
    res.status(400).json({ "error" : "Please send an object with keys pdfArray and value = array with at least 2 pdf ids"});
  }
});


app.get('/reset',(req, res, next) => checkBodyForValidAttributes(req, res, next, ['password']), (req, res) => {
  if (req.body.password !== 'masterPW') {
    res.sendStatus(401);
    return;
  }
  fs.readdir('./files', (err, dirs) => {
    console.log(dirs);
    if (err) {
      res.status(400);
      return;
    }
    for (const dir of dirs) {
      fs.remove('./files/' + dir, (err) => {
        if (err) {
          console.error(err);
          return;
        }
      });
    }

    User.deleteMany({}, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("No erros occurred");
      }
    });
    Document.deleteMany({}, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("No errors occurred");
      }
    });

    res.status(200).json({ "Message" : "All files and db entries were deleted successfully"});
  });
});

app.post('/test', (req, res) => {
  let dir = './files/';


  let result = generateFilename('./files/leon/', '2000-2-stuff-title');
  console.log(result);
  // fs.readdir(dir, (err, files) => {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     files.forEach(file => {
  //       console.log(file);
  //     });
  //   }
  // });

    res.sendStatus(200);
  });

app.post('/testAll', (req, res) => {
    let dir = './';
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
  let dir = './files/' + res.locals.user.username;
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

function deleteDocumentsFromDB(idArray) {
   
    let NoError = true;
      console.log("This is the id array " + idArray);
      idArray.forEach(id => {
        Document.deleteOne({"_id":id}, function(err) {
          if (err) {
            console.log(err);
            error = false;
          }
        });
        console.log("Document " + id + " has been deleted from db");
      });

return NoError;
}
function deleteDocumentsFromFS(pathArray) {

  let noError = true;

      pathArray.forEach(filePath => {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
            noError = false;
          } else {
            console.log("File at " + filePath + " has been deleted");
          }
        });
      });
return noError;
}
function generateFilename(dirPath, filePrefix) { 
  let generatedFilename = null;


  let files = fs.readdirSync(dirPath);
  
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
  generatedFilename = dirPath + newFilename;
  console.log(generatedFilename);
        
 return generatedFilename;       
}



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
  let usernameR = new RegExp(["^", req.body.username, "$"].join(""), "i");
  let queryUsername = { "username": usernameR };
  User.findOne(queryUsername).then((result) => {
    console.log("This is the result for username: " + result);
    if (result == null) {
      let emailR = new RegExp(["^", req.body.email, "$"].join(""), "i");
      let queryEmail = { "email": emailR };
      User.findOne(queryEmail).then((result) => {
      console.log("This is the result for email: " + result);
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


app.post('/register', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['email', 'username', 'firstName', 'lastName', 'password']), (req, res, next) => checkUsernameAndEmail(req, res, next), (req, res) => {

  const newUser = new User({
    email: req.body.email,
    username: req.body.username,
    password: User.hashPassword(req.body.password),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    picture: "./default.png",
    institutions: ['other'],
    lastLoggedIn: new Date(),
  });
  const promise = newUser.save();
  console.log(newUser);

  promise.then((doc) => {
    if (fs.existsSync('./files/' + req.body.username)) {
      //console.log("Directory already exists");
      fs.remove('./files/' + req.body.username, function (err) {
        if (err) {
          console.log(err);
        } 
      });
    }
    fs.mkdir(`./files/${req.body.username}`, { recursive: true }, (err) => {
      if (err) {
        console.log(err);
      } else {
        fs.copyFile("picture.png", './files/' + req.body.username + '/picture.png');
      }
    });
    res.status(201).json(doc);
  });

  promise.catch((err) => res.status(500).json({ message: 'Error registering user.', error: err }));
});

app.post('/login', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['userIdentifier', 'password']), async (req, res) => {
// make sure files folder is set up
if (fs.existsSync('./files/')) {
  console.log("Files folder aready existing");
} else {
fs.mkdir('./files/', { recursive: true }, (err) => {
  if (err) console.log(err);
});
console.log("Files folder created");
}


    var firstQuery = await User.findOne({"username": req.body.userIdentifier}).exec();
    var secondQuery = await User.findOne({"email": req.body.userIdentifier}).exec();
     console.log(firstQuery);
     console.log(secondQuery);
  
     if (firstQuery && secondQuery == null && firstQuery.isValid(req.body.password, firstQuery.password)) {
      User.findOneAndUpdate({"_id" : firstQuery._id}, { lastLoggedIn: new Date()}, {upsert:false}, function(err, doc){
        if (err) {
          console.log(err);
        }
        });

        console.log('Valid password');
        const token = jwt.sign({ userID: firstQuery._id }, 'secret', { expiresIn: '3h' });
        //console.log(token);
         res.status(200).json({
          "loginStatus": "true",
          "token": token,
        });
     } else if (firstQuery == null && secondQuery && secondQuery.isValid(req.body.password, secondQuery.password)) {
        
      User.findOneAndUpdate({"_id" : secondQuery._id}, { lastLoggedIn: new Date()}, {upsert:false}, function(err, doc){
        if (err) {
          console.log(err);
        }
        });

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

app.get('/userInfo', validateToken, async (req, res) => {

  let documentCount = await Document.find({"user":res.locals.user._id}).countDocuments();
  let todoCount = await Todo.find({"user":res.locals.user._id}).countDocuments();

  let responseJson = {
    "institutions": res.locals.user.institutions,
  "_id": res.locals.user._id,
  "email": res.locals.user.email,
  "username": res.locals.user.username,
  "firstName": res.locals.user.firstName,
  "lastName": res.locals.user.lastName,
  "picture": res.locals.user.picture,
  "lastLoggedIn": res.locals.user.lastLoggedIn,
  "documentCount": documentCount,
  "todoCount": todoCount
  }

  res.status(200).json(responseJson);

});

app.put('/editUser', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['email', 'firstName', 'lastName']), (req, res) => {

  User.updateOne({"_id":res.locals.user._id},{"email":req.body.email, "firstName": req.body.firstName, "lastName": req.body.lastName}, (err) => {
  if (err) {
    console.log(err);
    res.sendStatus(500);
  } else {
    res.sendStatus(200);
  }
  });


});

app.post('/changePW', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['password']), (req, res) => {
 
  User.updateOne({"_id":res.locals.user._id}, {"password":User.hashPassword(req.body.password)}, (err) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
    });

});

app.post('/deleteUser', validateToken, (req, res) => {
  console.log("Deleting user");
  // clean db
  User.deleteOne({"_id": res.locals.user._id}, function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log(res.locals.user.username + " has been deleted");
    }
  });
  Document.deleteMany({"user":res.locals.user._id}, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("All documents of " + res.locals.user.username + " deleted");
    }
  });
  Todo.deleteMany({"user":res.locals.user._id}, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("All documents of " + res.locals.user.username + " deleted");
    }
  });

  fs.remove('./files/' + res.locals.user.username, (err) => {

    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }

  });






});

app.get('/userPicture', validateToken, (req, res) => {

let picturePath = fs.readdirSync("./files/" + res.locals.user.username).filter(fn => fn.startsWith('picture.'));
if (picturePath.length > 0) {
  console.log(picturePath);
  let imagePath = "./files/" + res.locals.user.username + "/" + picturePath[0];
  //res.sendFile("./files/" + res.locals.user.username + "/" + picturePath[0], {root:'.'});
  const stream = fs.createReadStream(imagePath);
  res.writeHead(200, {
    'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(imagePath))}'`,
    'Content-type': 'image/png',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET',
    'Access-Control-Expose-Headers': '*',
  });
   stream.pipe(res);
} else {
  console.log("Error finding picture");
  res.sendStatus(500);
}

});

app.post('/updatePicture', validateToken, (req, res) => {

  form.uploadDir = "./files/" + res.locals.user.username;

  form.parse(req, function(err, file) {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else if (oldPictureName.length > 0) {
      console.log(file.image);
      if (file.image.hasOwnProperty('path')) {
        console.log(file.image.path);
        let filePath = file.image.path;
        let fileName = file.image.name;
        let oldPictureName = fs.readdirSync("./files/" + res.locals.user.username).filter(fn => fn.startsWith('picture.'));
        console.log(oldPictureName);
     
        fs.unlink("./files/" + res.locals.user.username + "/" + oldPictureName);
        fs.rename(filePath, form.uploadDir + "/" + fileName);
        res.sendStatus(200);
      } else {
        console.log("Property path does not exist");
        res.status(500).json({ "error": "Could not accept the picture because of some issue"});
      }
    }
   
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
  //console.log(res.locals.user);
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
          const docData = `{ "year" : "${document.year}", "month" : "${document.month}", "institution" : "${document.institution}", "importance" : "${document.importance}", "description" : "${document.description}", "title" : "${document.title}", "id" : "${document._id.toString()}"}`;
          documentInfo.push(docData);
        });

        resolve(documentInfo);
      }
    });
  });
    // .replace(/'/g,'')
  let data = '{ "documentInfo": [';
  let comma = '';
  console.log("Currently belong " + infoArray.length + " documents to " + res.locals.user.username);
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

let currentFile = null;
let currentFileCount = 6;

app.post('/currentDocumentData', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['year', 'month', 'institution', 'importance']), async (req, res) => {
  console.log("Value of mergeFileToEdit is " + mergedFileToEdit);
  const { year } = req.body;
  const { month } = req.body;
  const { institution } = req.body;
  const { importance } = req.body;
  const { description } = req.body;
  const { title } = req.body;
  const dirPath = './files/' + res.locals.user.username + '/';
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

      if (mergedFileToEdit) {
        fs.copyFile(newFilesDir + "/newMergedPDF.pdf", generatedFilename, (error) => {  
          if (error) {
            console.log(err);
            res.status(500).json({ "error": "Error while moving the file"});
          } else {
            console.log('Success');
            //console.log(destinationDirectory + newFilename);
          }
          //mergedFileToEdit = false;
          fs.remove('./newFiles/newMergedPDF.pdf', (err) => {
            if (err) {
              console.error(err);
              return;
              }
            });
          });

        } else if (currentFile !== null) {
          console.log("moving file to dir normally");
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

                // send next file
                fs.readdir(newFilesDir, (err, files) => {
                  // console.log("Reading ./newFiles");
                  // console.log(files.length);
                  if(err) {
                    console.log(err);
                  } else if (files.length == 0 || currentFileCount == 0) {
                    currentFile = null;
                    console.log("New file count is: " + currentFileCount);

                    res.writeHead(200, {
                      'Access-Control-Allow-Origin': '*',
                      'Access-Control-Allow-Methods': 'POST, GET',
                      'fileCount': 0,
                      'Access-Control-Expose-Headers': '*',
                    });
                  } else if (currentFileCount == null) {

                    res.writeHead(200, {
                      'Access-Control-Allow-Origin': '*',
                      'Access-Control-Allow-Methods': 'POST, GET',
                      'fileCount': 0,
                      'Access-Control-Expose-Headers': '*',
                    });
                  } else {

                    currentFileCount --;
                    console.log("New file count is: " + currentFileCount);
  
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

});

app.post('/deleteDocument', validateToken,  (req, res, next) => checkBodyForValidAttributes(req, res, next, ['documentID']), (req, res) => {

        Document.findOne({"_id":req.body.documentID}, function(err, doc) {
          if(err) {
            console.log(err);
          } else {
            if (fs.existsSync(doc.filePath)) {
              fs.unlink(doc.filePath);
              console.log("File at " + doc.filePath + " has been deleted");
            } else {
              console.log("File to be deleted does not exist");
            }
          }
        });

        Document.deleteOne({"_id":req.body.documentID}, function(err) {
          if (err) {
            console.log(err);
          }
        });
        console.log("Document " + req.body.documentID + " has been deleted from db");


        res.sendStatus(200);

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
    user: userIDvar,
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








require('./app/routes/institution_routes')(app, validateToken, checkBodyForValidAttributes);
require('./app/routes/todo_routes')(app, validateToken, checkBodyForValidAttributes);


app.listen(port, () => {
    // make sure files folder is set up
    if (fs.existsSync('./files/')) {
      console.log("Files folder aready existing");
  } else {
    fs.mkdir('./files/', { recursive: true }, (err) => {
      if (err) console.log(err);
    });
    console.log("Files folder created");
  
    // create user folder
  User.find({}, function(err, res) {
    console.log(res);
    if (res.length > 0) {
      res.forEach(user => {
        fs.mkdir(`./files/${user.username}`, { recursive: true }, (err) => {
          if (err) {
            console.log(err);
          } else {
            fs.copyFile("picture.png", './files/' + user.username + '/picture.png');
          }
        });      
      });
      console.log("Initialized user directories with picture");
    }
  });

  }



  // fs.mkdir(`./files/${req.body.username}`, { recursive: true }, (err) => {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     fs.copyFile("picture.png", './files/' + req.body.username + '/picture.png');
  //   }
  // });

  // move image

  console.log(`The app listening on port: ${port}`);
});
