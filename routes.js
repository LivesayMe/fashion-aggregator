var express = require('express');
const mongodb = require('./mongodb');
var mongo = require('mongodb');
var router = express.Router();
const outfit = require('./outfit');
const bcrypt = require('bcrypt');
require('dotenv').config();
const uuid = require('uuid');

var admin = require("firebase-admin");

var serviceAccount = JSON.parse(process.env.FIRE_AUTH_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const saltRounds = 12;

//Default index route
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.get('/static/css/:id', function(req, res, next) {
    res.sendFile(__dirname + '/views/static/css/' + req.params.id);
})

router.get('/static/js/:id', function(req, res, next) {
    res.sendFile(__dirname + '/views/static/js/' + req.params.id);
})

router.get('/manifest.json', function(req, res, next) {
    res.sendFile(__dirname + '/views/manifest.json');
})



/* USER ROUTES */
//Get a user from the database from the param id
router.get('/user/:id', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
    }
    try {
        const db = await mongodb.getDb();
        if(req.params.id.length > 12)
        {
            const user = await db.collection('users').findOne({gid: req.params.id});
            res.send({user: user, session: await createSession(user._id)});
        }
        else
        {
            const user = await db.collection('users').findOne({_id: new mongo.ObjectID(req.params.id)});
            res.json(user);
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Add a user to the database
router.post('/user', async function(req, res, next) {
    console.log("Adding user");
    try {
        const user = req.body;

        //Check that the username hasn't been taken
        const db = await mongodb.getDb();
        const userExists = await db.collection('users').findOne({username: user.username});
        if (userExists) {
            res.sendStatus(400).send(({"error": "Username already taken"}));
            return;
        }

        var password = req.body.password;
        var salt = bcrypt.genSaltSync(saltRounds);
        var hash = bcrypt.hashSync(password, salt);
        user.password = hash;

        //Add the user to the database
        const results = await mongodb.getDb().collection('users').insertOne(user);
        res.json({id: results.insertedId, session: await createSession(results.insertedId)});
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Add a user to the database with a google account
router.post('/user/token', async function(req, res, next) {
    try {
        const user = req.body;
        const db = await mongodb.getDb();
        const id = user._id;
        
        //Check that the username hasn't been taken
        const userExists = await db.collection('users').findOne({gid: user._id});
        if (userExists) {
            // res.sendStatus(400).send(({"error": "User already exists"}));
            res.json(userExists);
            return;
        }
        user.gid = user._id;
        user._id = null;

        const results = await db.collection('users').insertOne(user);
        res.json({id: results.insertedId, session: await createSession(results.insertedId)});
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Authenticate user 
router.post('/user/authenticate', async function(req, res, next) {
    try {
        const user = req.body;
        //Get user from database with username
        const db = await mongodb.getDb();
        const userDb = await db.collection('users').findOne({username: user.username});
        if (userDb) {
            //Compare password with hash in database
            if (bcrypt.compareSync(user.password, userDb.password)) {
                var s = await createSession(userDb._id);
                res.json({"session": s, "user": userDb});
                return;
            } else {
                res.sendStatus(401).send(({"error": "Invalid password"}));
                return;
            }
        } else {
            res.sendStatus(401).send(({"error": "Invalid username"}));
            return;
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Update a user in the database
router.put('/user/:id', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
        return;
    }
    //Ensure authorization
    const session = req.body.session;
    var authorized = await authorizeSession(session, false, false, true, true, req.params.id);
    if (authorized !== true) {
        res.sendStatus(401).send(({"error": authorized}));
        return;
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
        return;
    }
    //Ensure authorization
    const session = req.body.session;
    var authorized = await authorizeSession(session, false, false, true, false, req.params.id);
    if (authorized !== true) {
        res.sendStatus(401).send(({"error": authorized}));
        return;
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
        return;
    }
    //Ensure authorization
    const session = req.body.session;
    var authorized = await authorizeSession(session, false, false, false, true, req.params.id);
    if (authorized !== true) {
        res.sendStatus(401).send(({"error": authorized}));
        return;
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
        return;
    }

    //Ensure authorization
    const session = req.body.session;
    var authorized = await authorizeSession(session, false, false, false, true, req.params.id);
    if (authorized !== true) {
        res.sendStatus(401).send(({"error": authorized}));
        return;
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

//Logout a user by deleting all sessions with their id
router.delete('/user/:id/logout', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
        return;
    }
    //Ensure authorization
    const session = req.body.session;
    var authorized = await authorizeSession(session, false, false, true, false, req.params.id);
    if (authorized !== true) {
        res.sendStatus(401).send(({"error": authorized}));
        return;
    }
    try {
        const db = await mongodb.getDb();
        const results = await db.collection('sessions').deleteMany({user: new mongo.ObjectID(req.params.id)});
        res.json(results);  
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Get user embedding
router.get('/user/:id/embedding', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
        return;
    }
    //Ensure authorization
    const session = req.body.session;
    var authorized = await authorizeSession(session, false, false, false, true, req.params.id);
    if (authorized !== true) {
        res.sendStatus(401).send(({"error": authorized}));
        return;
    }
    try {
        const db = await mongodb.getDb();
        const user = await db.collection('users').findOne({_id: new mongo.ObjectID(req.params.id)});
        res.json(user.embedding);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

/* SESSION ROUTES*/
//Create session for a user
async function createSession(uid) {
    try {
        //Make sure the user exists
        const db = await mongodb.getDb();
        const user = await db.collection('users').findOne({_id: new mongo.ObjectID(uid)});
        if (!user) {
            res.sendStatus(400).send(({"error": "User does not exist"}));
            return;
        }
        //Create a session for the user
        const session = {
            user: uid,
            token: uuid.v4(),
            timestamp: new Date(),
            canReview: true,
            canUpload: true,
            canDelete: true,
            canRead: true,
        };
        console.log(session.token)
        const results = await db.collection('sessions').insertOne(session);
        return session.token
    }
    catch (err) {
        console.log(err);
        return null;
    }
};

//Get permission from token
async function getPermissions(token) {
    try {
        const db = await mongodb.getDb();
        const session = await db.collection('sessions').findOne({token: token});
        if (!session) {
            return null;
        }
        if (session.timestamp < new Date(new Date().getTime() - (1000 * 60 * 60 * 24 * 7))) {
            deleteSession(token);
            return -1;
        }
        return session;
    }
    catch (err) {
        console.log(err);
        return null;
    }
}

async function authorizeSession(token, review, upload, docDelete, read, uid) {
    if(!token) {
        return "No session token provided";
    }
    const sessionDetails = await getPermissions(token);
    if(!sessionDetails)
    {
        return "Session doesn't exist";
    }
    if(sessionDetails.user != uid)
    {
        return "Session doesn't belong to user";
    }
    if(!sessionDetails.canReview && review)
    {
        return "User doesn't have permission to review";
    }
    if(!sessionDetails.canUpload && upload)
    {
        return "User doesn't have permission to upload";
    }
    if(!sessionDetails.canDelete && docDelete)
    {
        return "User doesn't have permission to delete";
    }
    if(!sessionDetails.canRead && read)
    {
        return "User doesn't have permission to read";
    }
    if(sessionDetails.timestamp < new Date(new Date().getTime() - (1000 * 60 * 60 * 24 * 7)) || sessionDetails == -1)
    {
        return "Session expired";
    }
    return true;
}

//Delete a session
async function deleteSession(token) {
    try {
        const db = await mongodb.getDb();
        const results = await db.collection('sessions').deleteOne({token: token});
        return results;
    }
    catch (err) {
        console.log(err);
        return null;
    }
} 


/* RATING ROUTES */
//Get a rating from the database from the param id
router.get('/rating/:id', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No rating id provided"}));
        return;
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
        return;
    }
    //Ensure authorization
    const session = req.body.session;
    var authorized = await authorizeSession(session, true, false, false, false, req.body.userId);
    if (authorized !== true) {
        res.sendStatus(401).send(({"error": authorized}));
        return;
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
            return;
        } else {
            const db = await mongodb.getDb();
            const results = await db.collection('outfits').aggregate([
                {$sample: {size: 1}}
            ]).toArray();
            res.json(results[0]);
            return;
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
        return;
    }
    try {
        const db = await mongodb.getDb();
        const outfit = await db.collection('outfits').findOne({_id: new mongo.ObjectID(req.params.id)});
        res.json(outfit);
        return;
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//Aggregate all ratings for a given outfit
router.get('/outfit/:id/average', async function(req, res, next) {
    if (!req.params.id) {
        res.sendStatus(400).send(({"error": "No outfit id provided"}));
        return;
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
        return;
    }
    if (!req.body.userId) {
        res.sendStatus(400).send(({"error": "No user id provided"}));
        return;
    }
    //Ensure authorization
    const session = req.body.session;
    var authorized = await authorizeSession(session, false, true, false, false, req.body.userId);
    if (authorized !== true) {
        res.sendStatus(401).send(({"error": authorized}));
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