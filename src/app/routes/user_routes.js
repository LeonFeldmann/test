module.exports = function (app, validateToken, checkBodyForValidAttributes, currentDir) {
    const fs          = require('fs-extra');
    const jwt         = require('jsonwebtoken');
    const mongoose    = require('mongoose');
    const multer      = require('multer');
    const path        = require('path');

    const Schemata    = require('../../models/user');
    const Document    = require('../../models/document');
    const User        = mongoose.model('user', Schemata.User);
    const Todo        = mongoose.model('todo', Schemata.Todo);

    const upload = multer({dest: "newFiles"});

    function checkUsernameAndEmailForUniqueness(req, res, next) {
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

    // send userinfo
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
    // send current user picture, default is provided
    app.get('/userPicture', validateToken, (req, res) => {
    
        let picturePath = fs.readdirSync( currentDir + "/files/" + res.locals.user.username).filter(fn => fn.startsWith('picture.'));
        console.log(picturePath);
        if (picturePath.length > 0) {
        //console.log(picturePath);
        let imagePath = currentDir + "/files/" + res.locals.user.username + "/" + picturePath[0];
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
    // receive user credentials and create new user if unique
    app.post('/register', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['email', 'username', 'firstName', 'lastName', 'password']), (req, res, next) => checkUsernameAndEmailForUniqueness(req, res, next), (req, res) => {
    
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
        //console.log(newUser);
    
        promise.then((doc) => {
        if (fs.existsSync(currentDir + '/files/' + req.body.username)) {
            //console.log("Directory already exists");
            fs.remove(currentDir + '/files/' + req.body.username, function (err) {
            if (err) {
                console.log(err);
            } 
            });
        }
        fs.mkdir(currentDir + `/files/${req.body.username}`, { recursive: true }, (err) => {
            if (err) {
            console.log(err);
            } else {
            fs.copyFile(currentDir + "/picture.png", currentDir + '/files/' + req.body.username + '/picture.png');
            console.log("User dir was initialized successfully");
            }
        });
        res.sendStatus(200);
        });
    
        promise.catch((err) => res.status(500).json({ message: 'Error registering user.', error: err }));
    });
    // receive credentials and send jwt token encoded with user
    app.post('/login', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['userIdentifier', 'password']), async (req, res) => {
  // make sure files folder is set up
  if (fs.existsSync(currentDir + '/files/')) {
    console.log("Files folder aready existing");
  } else {
  fs.mkdir(currentDir + '/files/', { recursive: true }, (err) => {
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
    // change pw of logged in user
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
    // delete user and all files/db entries corresponding to user that is currently logged in
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
    // update userpicture located in user's directory
    app.post('/updatePicture', validateToken, upload.single('image'), (req, res) => {
        //console.log(req.file);
        let oldPicture = fs.readdirSync(currentDir + "/files/" + res.locals.user.username).filter(fn => fn.startsWith('picture.'));
    
        let rex = new RegExp(".*(\\.\\w+)");
        let string = req.file.originalname;
        let mime = string.match(rex)[1];
    
        if (req.hasOwnProperty("file")) {
        fs.unlink(currentDir + "/files/" + res.locals.user.username + "/" + oldPicture);
        fs.move(req.file.path, currentDir + "/files/" + res.locals.user.username + "/picture" + mime);
        res.sendStatus(200);
        } else {
        console.log("No file arrived");
        res.sendStatus(500);
        }
    
    
    
    // multiparty implementation, does not work on heroku
    // ! watchout key is important = "image"
    
        // let form = new multiparty.Form();
        // form.uploadDir = "./files/" + res.locals.user.username;
    
        // form.parse(req, function(err, field, file) {
        //   if (err) {
        //     console.log(err);
        //   } else {
        //     console.log(file.image[0].path);
        
        //     if (fs.existsSync(form.uploadDir + "/" + "picture.png")) {
        //       fs.unlink("./files/" + res.locals.user.username + "/" + "picture.png");
        //      } else {
        //         console.log("File to be deleted did not exist");
        //       }
    
        //     if (fs.existsSync(file.image[0].path)) {
        //       fs.rename(file.image[0].path, form.uploadDir + "/" + "picture.png");
        //     } else {
        //       console.log("File to be renamed did not exist");
        //     }
        //   }
    
        // });
    
    
        // let form = new formidable.IncomingForm();
        // form.keepExtensions = true;
        // form.uploadDir = "./files/" + res.locals.user.username;
        // form.parse(req);
    
        // let oldPicture = fs.readdirSync("./files/" + res.locals.user.username).filter(fn => fn.startsWith('picture.'));
        // console.log(oldPicture);
        // let newPicture = fs.readdirSync("./files/" + res.locals.user.username).filter(fn => fn.startsWith('upload_'));
        // console.log(newPicture);
    
        
        // setTimeout(() => {
        //   fs.unlink("./files/" + res.locals.user.username + "/" + oldPicture[0]);
        //   fs.rename(form.uploadDir + "/" + newPicture[0], form.uploadDir + "/" + "picture.png");
        // }, 2000);
    
        // if (picturePathArray.length > 0) {
        // console.log("Inside first if");
    
        //form.parse(req, (err, fields, file) => {
            //console.log("Inside form.parse");
    
            // console.log("This is inside the callback " + picturePathArray[0]);
            // if (err) {
            //   console.log(err);
            // } else if (picturePathArray[0] !== null) {
            //   console.log("inside the inner if statement");
            //   let filePath = file.image.path;
            //   let fileName = file.image.name;
            //   if (fs.existsSync("./files/" + res.locals.user.username + "/" + picturePathArray[0])) {
            //     console.log("./files/" + res.locals.user.username + "/" + picturePathArray[0] + " exists");
            //     fs.unlink("./files/" + res.locals.user.username + "/" + picturePathArray[0], (err) => {
            //       if (err) 
            //         console.log(err);
            //     }); 
            //     console.log("Deleted old file");
            //   } else {
            //     console.log("./files/" + res.locals.user.username + "/" + picturePathArray[0] + " does not exist, no deletion possible");
            //   }
            //   if (fs.existsSync(filePath)) {
            //   fs.rename(filePath, form.uploadDir + "/" + fileName, (err) => {
            //     if (err)
            //     console.log(err);
            //   });
            //   console.log("Renamed new file");
            //   } else {
            //     console.log(filePath + " does not exist, no renaming possible");
            //   }
            //    picturePathArray[0] = null;  
            // }
        
        //});
    
        //console.log("After the form .parse");
        //res.sendStatus(200);
    
        // } else {
        //   res.sendStatus(500);
        // }
    
    
    
        
    
    });
    // route for testing purposes
    app.get('/reset',(req, res, next) => checkBodyForValidAttributes(req, res, next, ['password']), (req, res) => {
        if (req.body.password !== 'masterPW') {
        res.sendStatus(401);
        return;
        }
        fs.readdir(currentDir + '/files', (err, dirs) => {
        console.log(dirs);
        if (err) {
            res.status(400);
            return;
        }
        for (const dir of dirs) {
            fs.remove(currentDir + '/files/' + dir, (err) => {
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
    // update user attributes
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







}