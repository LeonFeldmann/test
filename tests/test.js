const assert = require('assert');
const mongoose = require('mongoose');


const Schemata    = require('./models/user');
const Document    = require('./models/document');
const User        = mongoose.model('user', Schemata.User);
const Todo        = mongoose.model('todo', Schemata.Todo);


// describe tests
describe('very basic test', function(){

    //create tests
    it('creates an author with sub-documents', function(done) {

    const newUser = new User({
        email: "test@gmail.com",
        username: "test",
        password: "testPW",
        firstName: "Leon",
        lastName: "Feldmann",
        picture: "/defaults/picture.png",
        institutions: ['other'],
        lastLoggedIn: new Date()
        });

        newUser.save().then(function(){

            User.findOne({username:"test"}).then(function(record) {
                assert(record.firstName == "Leon");
            });

        });
    
    });

});