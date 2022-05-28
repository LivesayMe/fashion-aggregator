var express = require('express');
const mongodb = require('./mongodb');
var mongo = require('mongodb');
var router = express.Router();
const outfit = require('./outfit');

/* USER ROUTES */
//Get a user from the database from the param id
router.get('/user/:id', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
    }
    try {
        const db = await mongodb.getDb();
        const user = await db.collection('users').findOne({_id: new mongo.ObjectID(req.params.id)});
        res.json(user);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Add a user to the database
router.post('/user', async function(req, res, next) {
    try {
        const user = req.body;
        const results = await mongodb.getDb().collection('users').insertOne(user);
        res.json(results);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Update a user in the database
router.put('/user/:id', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
    }
    try {
        const user = req.body;
        const results = await mongodb.getDb().collection('users').updateOne({_id: new mongo.ObjectID(req.params.id)}, {$set: user});
        res.json(results);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Delete a user from the database
router.delete('/user/:id', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
    }
    try {
        const results = await mongodb.getDb().collection('users').deleteOne({_id: new mongo.ObjectID(req.params.id)});
        res.json(results);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Get all favorites outfits from a user
router.get('/user/:id/favorites', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
    }
    try {
        const db = await mongodb.getDb();
        const user = await db.collection('users').findOne({_id: new mongo.ObjectID(req.params.id)});
        const favorites = user.favorites;
        const outfits = await db.collection('outfits').find({_id: {$in: favorites}}).toArray();
        res.json(outfits);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Get all ratings from a user
router.get('/user/:id/ratings', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
    }
    try {
        const db = await mongodb.getDb();
        const user = await db.collection('users').findOne({_id: new mongo.ObjectID(req.params.id)});
        const ratings = user.ratings;
        const outfits = await db.collection('outfits').find({_id: {$in: ratings}}).toArray();
        res.json(outfits);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

/* RATING ROUTES */

//Get a rating from the database from the param id
router.get('/rating/:id', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No rating id provided"}));
    }
    try {
        const db = await mongodb.getDb();
        const rating = await db.collection('ratings').findOne({_id: new mongo.ObjectID(req.params.id)});
        res.json(rating);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Add a rating to the database, and add it to the user's ratings
router.post('/rating', async function(req, res, next) {
    if(!req.body.userId || !req.body.outfitId) {
        res.sendStatus(400).send(({"error": "No user id or outfit id provided"}));
    }
    try {
        const rating = req.body;
        const results = await mongodb.getDb().collection('ratings').insertOne(rating);
        const user = await mongodb.getDb().collection('users').findOne({_id: new mongo.ObjectID(rating.userId)});
        await mongodb.getDb().collection('users').updateOne({_id: new mongo.ObjectID(rating.userId)}, {$push: {ratings: rating._id}});
        res.json(results);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

/* OUTFIT ROUTES */

//Returns an outfit
//Generates an outfit with a 25% chance
//Selects a random outfit from the database with a 75% chance
router.post('/outfit', async function(req, res, next) {
    try {
        if (Math.random() < 0.25) {
            res.json(await outfit.generateOutfit());
        } else {
            const db = await mongodb.getDb();
            const results = await db.collection('outfits').aggregate([
                {$sample: {size: 1}}
            ]).toArray();
            res.json(results[0]);
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Get a outfit by id
router.get('/outfit/:id', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No outfit id provided"}));
    }
    try {
        const db = await mongodb.getDb();
        const outfit = await db.collection('outfits').findOne({_id: new mongo.ObjectID(req.params.id)});
        res.json(outfit);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Aggregate all ratings for a given outfit
router.get('/outfit/:id/average', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No outfit id provided"}));
    }
    try {
        const db = await mongodb.getDb();
        const ratings = await db.collection('ratings').find({outfitId: req.params.id}).toArray();
        //Get the average rating
        const average = ratings.reduce((acc, cur) => acc + cur.rating, 0) / ratings.length;
        //Return the average and the total number of ratings
        res.json({average: average, total: ratings.length});
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Add an outfit to a users favorites list
router.post('/outfit/:id', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No outfit id provided"}));
    }
    if (!req.body.userId) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
    }

    try {
        const db = await mongodb.getDb();
        const user = await db.collection('users').findOne({_id: new mongo.ObjectID(req.body.userId)});
        await db.collection('users').updateOne({_id: new mongo.ObjectID(req.body.userId)}, {$push: {favorites: req.params.id}});
        res.json(user);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});



module.exports = router;