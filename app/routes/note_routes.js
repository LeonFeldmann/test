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

        app.post('/document', (req, res) => {
            var date = req.body.date;
            var institution = req.body.institution;

            console.log(date);
            console.log(institution);
            console.log(req.body);

            var data = {
                    "id": 0,
                    "date": date,
                    "institution": institution
            };
            res.statusCode = 200;            
            res.send(data);
        });


       
    
    };


