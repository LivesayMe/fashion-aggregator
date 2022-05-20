const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'CS 341 API',
    description: 'API for CS 341 Week 04'
  },
  host: 'safe-fjord-75598.herokuapp.com',
  schemes: ['https']
};

const outputFile = './swagger.json';
const endpointsFiles = ['./routes.js'];

// generate swagger.json
swaggerAutogen(outputFile, endpointsFiles, doc);