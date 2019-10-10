const express = require('express');
// const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const app =  express();
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: true }));
require('./app/routes')(app, {});



app.get('/', (req, res) => res.send('Hello World!'));



app.get('/document', function(req, res, next) {

  const filePath = './example.pdf';
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
      'Content-disposition': 'attachment; filename="' + encodeURIComponent(path.basename(filePath))  + '"',
      'Content-type': 'application/pdf',
  });
  res.send();
});


// catch 400
app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(400).send(`Error: ${res.originUrl} not found`);
    next();
});




app.listen(port, () => {console.log('Example app listening in port: ' + port);});

