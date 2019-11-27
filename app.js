const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const merge = require('easy-pdf-merge');

const Schemata = require('./models/user');
const Document = require('./models/document');


const User = mongoose.model('user', Schemata.User);
const Todo = mongoose.model('todo', Schemata.Todo);

const app = express();


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

app.use(require('express-session')({
  secret: 'Anything at all',
  resave: false,
  saveUninitialized: false,
}));


app.use(bodyParser.json({ extended: true }));
const port = process.env.PORT || 3000;


let mergedFileToEdit = false;
app.post('/mergePDFs', validateToken, async (req, res) => {
  
  if (req.body.hasOwnProperty('pdfArray') && Array.isArray(req.body.pdfArray) && req.body.pdfArray.length >= 2) {
    
  
    let pdfIDArray = req.body.pdfArray;
    let pdfArray = [];
    let idsAreInvalidOrNull = false;

    for (let i = 0; i < pdfIDArray.length; i ++) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        idsAreInvalidOrNull = true;
        break;
      } else {
        let file = await Document.findOne({"_id": pdfIDArray[i]}).exec();
        if (file == null) {
          idsAreInvalidOrNull = true;
          break;
        }
        pdfArray.push(file);
      }

    }



    if (idsAreInvalidOrNull) {
      res.status(400).json({"error" : "Please use valid document ids"});
    } else {

      console.log(pdfArray);

      res.sendStatus(200);
      }



    // if (pdfArray.length < 2) {

    // } else {

    // }


    // var firstFile = await Document.findOne({"_id": req.body.firstPDFid}).exec();
    // var secondFile = await Document.findOne({"_id": req.body.secondPDFid}).exec();

  
    // const files = [firstFile.filePath, secondFile.filePath];
    // const newFilePath = "newFiles/newMergedPDF.pdf";
    // merge(files, newFilePath, function(err) {
    //   if (err) {
    //     console.log(err);
    //   } else {
      
    //   Document.deleteOne({"_id":req.body.firstPDFid}, function(err) {
    //     if (err) {
    //       console.log(err);
    //     }
    //   });
    //   Document.deleteOne({"_id":req.body.secondPDFid}, function(err) {
    //     if (err) {
    //       console.log(err);
    //     }
    //   });
  
  
  
    //   currentFileCount++;
    //   mergedFileToEdit = true;
    //   const stream = fs.createReadStream(newFilePath);
    //   res.writeHead(200, {
    //     'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(newFilePath))}'`,
    //     'Content-type': 'application/pdf',
    //     'Access-Control-Allow-Origin': '*',
    //     'Access-Control-Allow-Methods': 'POST, GET',
    //     'fileCount': currentFileCount,
    //     'Access-Control-Expose-Headers': '*',
    //   });
    //    stream.pipe(res);
    //   }
    // });


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
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.log(err);
    } else {
      files.forEach(file => {
        console.log(file);
      });
    }
  });

  console.log("Success");
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
  
    console.log("Success");
      res.sendStatus(200);
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


app.post('/register', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['email', 'username', 'password']), (req, res, next) => checkUsernameAndEmail(req, res, next), (req, res) => {

  const newUser = new User({
    email: req.body.email,
    username: req.body.username,
    password: User.hashPassword(req.body.password),
    todos: [],
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
      if (err) console.log(err);
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

        if (mergedFileToEdit) {
          fs.copyFile(newFilesDir + "/newMergedPDF.pdf", generatedFilename, (error) => {  
            if (error) {
              console.log(err);
              res.status(500).json({ "error": "Error while moving the file"});
            } else {
              console.log('Success');
              //console.log(destinationDirectory + newFilename);
            }
            mergedFileToEdit = false;
            fs.remove('./newFiles/newMergedPDF.pdf', (err) => {
              if (err) {
                console.error(err);
                return;
              }
            });
          });
        } else if (currentFile !== null) {
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
                    res.writeHead(200, {
                      'Access-Control-Allow-Origin': '*',
                      'Access-Control-Allow-Methods': 'POST, GET',
                      'fileCount': 0,
                      'Access-Control-Expose-Headers': '*',
                    });
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

});



app.get('/todos', validateToken, (req, res) => {
  
  Todo.find({"user":res.locals.user._id},{"user":false, "__v":false}, (err, todos) => {
  
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      res.status(200).json({"todos" : todos});
    }
  });
  
});

app.post('/createTodo', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['todoTitle']), (req, res) => {

  let todo = new Todo({
    "title" : req.body.todoTitle,
    "marked" : false,
    "user" : res.locals.user._id,
  });

  todo.save((err, todo) => {
    if (err) {
      console.log('Error adding to DB');
      res.status(500).json({ "error": "While writing the entry to the db the following error occured: " + err});
    } else {
      console.log('Successfully saved todo to db');
      console.log(todo);
      res.sendStatus(200);
    }
  });

    // if (todoArray.length == 1 && Object.keys(todoArray[0]).length === 0) {
    //   todoArray[0] = todo;
    // } else {
    //   todoArray.push(todo);
    // }
    // console.log(todoArray);
    //  User.findOneAndUpdate({"_id" : res.locals.user._id}, { todos: todoArray}, {upsert:false}, function(err, doc){
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     console.log("Todo updated");
    //   }
    //   res.sendStatus(200);
    //   });
    
  // }



});

app.post('/deleteTodo', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['todoID']), (req, res) => {
  Todo.findOneAndDelete({"_id":req.body.todoID, "user": res.locals.user._id}, (err) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });

});

app.post('/markTodo', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['todoID']), (req, res) => {
  
  Todo.findOneAndUpdate({"_id":req.body.todoID, "user": res.locals.user._id},{"marked":true} , (err, doc) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      console.log(doc);
      res.sendStatus(200);
    }
  });

});

app.post('/unmarkTodo', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['todoID']), (req, res) => {
  
  Todo.findOneAndUpdate({"_id":req.body.todoID, "user": res.locals.user._id},{"marked":false} , (err, doc) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      console.log(doc);
      res.sendStatus(200);
    }
  });

});




require('./app/routes')(app, {});
require('./app/routes/institution_routes')(app, validateToken, checkBodyForValidAttributes);


app.listen(port, () => {
  console.log(`The app listening on port: ${port}`);
});
