const express = require('express')
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const app =  express();
const port = 3000;

app.get('/', (req, res) => res.send('Hello World!'));





// catch 400
app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(400).send(`Error: ${res.originUrl} not found`);
    next();
});



//app.listen(port, () => {console.log('Example app listening in port: ' + port);});
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
  });


// test
// does this work?