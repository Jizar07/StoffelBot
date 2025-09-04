// Set environment variables for production
process.env.PORT = process.env.PORT || '3140';
process.env.NODE_ENV = 'production';

// Start the main application
require('./app.js');