// routes/index.js
const noteRoutes = require('./note_routes');

module.exports = (app, db) => {
  noteRoutes(app, db);
// Other route groups could go here, in the future
};
