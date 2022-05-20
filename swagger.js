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


const userSchema = 
{
    "type": "object",
    "properties": {
        "username": {
            "type": "string",
            "description": "The username of the user"
        },
        "email": {
            "type": "string",
            "description": "The email of the user"
        },
        "favorites": {
            "type": "array",
            "items": {
                "type": "string"
            },
            "description": "The IDs of the favorite outfits of the user"
        },
        "ratings": {
            "type": "array",
            "items": {
                "type": "string"
            },
            "description": "The IDs of the rated outfits of the user"
        }
    },
    "required": ["username", "email", "favorites", "ratings"]
};

const outfitSchema = 
{
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "description": "The name of the outfit"
        },
        "description": {
            "type": "string",
            "description": "The description of the outfit"
        },
        "images": {
            "type": "array",
            "items": {
                "type": "string"
            },
            "description": "IDs of the images of the outfit"
        }
    },
    "required": ["name", "description", "images"]
};

const ratingSchema = 
{
    "type": "object",
    "properties": {
        "userId": {
            "type": "string",
            "description": "The ID of the user who rated the outfit"
        },
        "outfitId": {
            "type": "string",
            "description": "The ID of the outfit that was rated"
        },
        "rating": {
            "type": "number",
            "description": "The rating of the outfit"
        }
    },
    "required": ["userId", "outfitId", "rating"]
};