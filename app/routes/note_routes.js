// routes/note_routes.js
module.exports = function(app, db) {  

    app.get('/notes', (req, res) => {    
        // You'll create your note here.  
        console.log(req.body);  
        res.send('Hello')  });
    
    
        app.get('/documentInfo', (req, res) => {
            var data = {
                "documentInfo": [
                  {
                    "id": 0,
                    "date": "string",
                    "institution": "string"
                  }
                ]
              }
            res.send(data);
        })
        


        // // receive pdf and specifications and return without file but with id
        // app.post('/document', (req, res) => {
        //     var date = req.body.date;
        //     var institution = req.body.institution;

        //     console.log(date);
        //     console.log(institution);
        //     console.log(req.body);

        //     var data = {
        //             "id": 0,
        //             "date": date,
        //             "institution": institution
        //     };
        //     res.statusCode = 200;    

        //     const filePath = './example.pdf';
        //     const stream = fs.createReadStream(filePath);
        //     res.writeHead(200, {
        //         'Content-disposition': 'attachment; filename="' + encodeURIComponent(path.basename(filePath))  + '"',
        //         'Content-type': 'application/pdf',
        //         'Access-Control-Allow-Origin': '*',
        //         'Access-Control-Allow-Methods': 'POST, GET'
        //     });
        //     stream.pipe(res);

        //     res.send(data);
        // });

        // app.get("/test", (req, res) => {

        //     res.writeHead(200, {
        //         'Content-type': 'application/pdf',
        //         'Access-Control-Allow-Origin': '*',
        //         'Access-Control-Allow-Methods': 'POST, GET'
        //     });

        //     res.sendFile("/Users/leonfeldmann/Desktop/WebFileViewerProject/example.pdf");
        // });


       
    
    };


