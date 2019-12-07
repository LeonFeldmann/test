module.exports = function (app, validateToken, checkBodyForValidAttributes, currentDir) {
    const mongoose = require('mongoose');
    const document = require('../../models/document');
    const fs       = require('fs-extra');
    const merge    = require('easy-pdf-merge');
    const path     = require('path');


    let currentFile = null;
    let currentFileCount = 0;


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
    function makedbEntry(yearvar, monthvar, institutionvar, importancevar, descriptionvar, titlevar, filePathvar, userIDvar) {
    console.log("in function");
    const doc = new document({
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
      } else {
        console.log('Successfully saved doc to db');
      }
      console.log(document);
    });
    }

    function deleteDocumentsFromDB(idArray) {
   
    let NoError = true;
      console.log("This is the id array " + idArray);
      idArray.forEach(id => {
        document.deleteOne({"_id":id}, function(err) {
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
    const port = process.env.PORT || 3000;
    function isLocal() {
        if (port == 3000) {
          return true;
        } else {
          return false;
        }
      
    }


    // send pdf matching the id
    app.get('/documentPDF/:id', validateToken, (req, res) => {
    const { id } = req.params;
    document.findById(id, 'filePath', (err, document) => {
      if (err) {
        // console.log('Error getting document by id');
        res.status(404).json({ "error": "This id is not associated with any existing document"});
      } else if(!fs.existsSync(document.filePath)) {
        res.status(500).json({ "error": "This document does not seem to exist anymore, probably because of a server restart"});
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
    // send specifications of all documents
    app.get('/documents', validateToken, async (req, res) => {
        //console.log(res.locals.user);
        // promise to get all entrys from db and add them to an array, then merge to json obj
        const infoArray = await new Promise((resolve, reject) => {
        document.find({}, (err, documents) => {
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
    // send receive specification of previous pdf and send next
    app.post('/currentDocumentData', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['year', 'month', 'institution', 'importance']), async (req, res) => {
        const { year } = req.body;
        const { month } = req.body;
        const { institution } = req.body;
        const { importance } = req.body;
        const { description } = req.body;
        const { title } = req.body;
        const dirPath = currentDir + '/files/' + res.locals.user.username + '/';
        const filePrefix = year + '-' + month + '-' + institution + '-' + title;
        console.log("Current user is: " + res.locals.user.username);
    
        if (currentFileCount == 0 || currentFile == null) {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET',
            'fileCount': 0,
            'Access-Control-Expose-Headers': '*',
        });
        res.send();
        return;
        }
    
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
            let newFilesDir = currentDir + "/newFiles";
            console.log("Generated filename: " + generatedFilename);

                console.log("moving file to dir");
                fs.move(newFilesDir + "/" + currentFile, generatedFilename);
                // fs.readdir(newFilesDir, (err, files) => {
                //   if (err) {
                //     console.log(err);
                //     currentFileCount = 0;
                //   } else {
                //     currentFileCount = files.length;
                //     console.log("New file count is: " + currentFileCount);
                //   }
                // });
                currentFileCount --;
           
            makedbEntry(year, month, institution, importance, description, title, generatedFilename.substr(2), res.locals.user._id);
            
    
                    // send next file
                    fs.readdir(newFilesDir, (err, files) => {
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
                        res.send();
                        } else {
                        
                        console.log("Current file count is " + currentFileCount);
                        console.log("Current number of files is " + files.length);
                        let index = 0;
                        if (!isLocal) {
                            index = 6 - currentFileCount;
                            currentFile = files[index];
                        } else {
                            currentFile = files[1];
                        }
    
                        console.log("new Currentfile is: " + currentFile);
                        let fileToSend = newFilesDir + '/' + files[index];
                        const stream = fs.createReadStream(fileToSend);
                        res.writeHead(200, {
                            'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(fileToSend))}'`,
                            'Content-type': 'application/pdf',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'POST, GET',
                            'fileCount': currentFileCount,
                            'Access-Control-Expose-Headers': '*',
                        });
                        stream.pipe(res);
    
                        }
                    });
                    }
        });
        
    });
    // start importing documents, send first pdf
    app.get('/importDocuments', validateToken, (req, res) => {
        
        const newFilesDir = currentDir + '/newFiles';
            // send next file
            fs.readdir(newFilesDir, (err, files) => {
            if(err) {
                console.log(err);
            } else if (false) {
                currentFile = null;
    
                  currentFileCount = 6;
                  fs.readdir("/default/files", (err, defaultFiles) => {
                    if(err) {
                      console.log(err);
                    } else {
                      defaultFiles.forEach(file => {
                        fs.copyFile("/default/files" + file, "/newFiles");
                      });
                    }
                  });
                  
                console.log("File count has been reset to 6");


                res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET',
                'Access-Control-Expose-Headers': '*',
                'fileCount': currentFileCount,
                });
                res.send();
    
            } else {
              currentFileCount = files.length;

              if(files.length == 0) {
                currentFileCount = 6;
                fs.readdir("./defaults/files", (err, defaultFiles) => {
                  if(err) {
                    console.log(err);
                  } else {
                    defaultFiles.forEach(file => {
                      fs.copyFile("defaults/files/" + file, "newFiles/" + file);
                    });
                  }

                  setTimeout(()=> {
                    let fileToSend = newFilesDir + '/ProblemSheet01.pdf';
                    currentFile = 'ProblemSheet01.pdf';
                    console.log("new Currentfile is: " + currentFile);
        
                    const stream = fs.createReadStream(fileToSend);
                    res.writeHead(200, {
                    'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(fileToSend))}'`,
                    'Content-type': 'application/pdf',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, GET',
                    'fileCount': currentFileCount,
                    'Access-Control-Expose-Headers': '*',
                    });
                    stream.pipe(res);
      
                  },1000);
           
                });
              
              console.log("File count has been reset to 6");



              } else {

                console.log(files[0]);
    
                let fileToSend = newFilesDir + '/' + files[0];
                currentFile = files[0];
                console.log("new Currentfile is: " + currentFile);
    
                const stream = fs.createReadStream(fileToSend);
                res.writeHead(200, {
                'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(fileToSend))}'`,
                'Content-type': 'application/pdf',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET',
                'fileCount': currentFileCount,
                'Access-Control-Expose-Headers': '*',
                });
                stream.pipe(res);

              }



    
            }
            });
    
    });
    // delete pdf matching pdf
    app.post('/deleteDocument', validateToken,  (req, res, next) => checkBodyForValidAttributes(req, res, next, ['documentID']), (req, res) => {
    
            document.findOne({"_id":req.body.documentID}, function(err, doc) {
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
    
            document.deleteOne({"_id":req.body.documentID}, function(err) {
                if (err) {
                console.log(err);
                }
            });
            console.log("Document " + req.body.documentID + " has been deleted from db");
    
    
            res.sendStatus(200);
    
    });
    // merge pdf files given by id array and receive specifications of new document
    app.post('/mergePDFs', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['year', 'month', 'institution', 'importance']), async (req, res) => {
        
      if (!isLocal) {
        res.status(500).json({ "error" : "This feature is currently only available locally, since java is required"});
        return;
      }



        if (req.body.hasOwnProperty('pdfArray') && Array.isArray(req.body.pdfArray) && req.body.pdfArray.length >= 2) {
        
        const { year } = req.body;
        const { month } = req.body;
        const { institution } = req.body;
        const { importance } = req.body;
        const { description } = req.body;
        const { title } = req.body;
        const dirPath = currentDir + '/files/' + res.locals.user.username + '/';
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
            let file = await document.findOne({"_id": pdfIDArray[i]}).exec();
            if (file == null) {
                idsAreValid = false;
                break;
            }
            pdfArray.push(file.filePath);
            }
    
        }
    
        if (idsAreValid) {
    
        // merging the pdfs
            merge(pdfArray, currentDir + "/newFiles/newMergedPDF.pdf" , function(err) {
            if (err) {
            console.log(err);
            res.status(500).json({"error" : "Error merging pdfs"});
            return;
            } else {
            console.log("successfully merge pdfs");
    
            deleteDocumentsFromDB(pdfIDArray);
            deleteDocumentsFromFS(pdfArray);
    
            let generatedFilename = generateFilename(dirPath, filePrefix);
    
            // write new file in db
            makedbEntry(year, month, institution, importance, description, title, generatedFilename.substr(2), res.locals.user._id);
    
            // move new file to fs
            fs.copyFile(currentDir + "/newFiles/newMergedPDF.pdf", generatedFilename, (error) => {  
            if (error) {
                console.log(err);
            } else {
                console.log('Success');
            }
            fs.remove(currentDir + '/newFiles/newMergedPDF.pdf', (err) => {
                if (err) {
                console.error(err);
                return;
                }
                });
            });
            }
    
        });
    
            res.sendStatus(200);
            return;
        } else {
            res.status(400).json({"error" : "Please use valid document ids"});
        }
        } else {
        res.status(400).json({ "error" : "Please send an object with keys pdfArray and value = array with at least 2 pdf ids"});
        }
    });






}