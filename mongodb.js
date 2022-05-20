const mongoClient = require('mongodb').MongoClient;
require('dotenv').config();

const uri = process.env.ATLAS_URI;

let _db;

const initDB = callback => {
    if (_db)
    {
        console.log('Databse is already initialized');
        return callback(null, _db);
    }
    mongoClient.connect(uri).then(client => {
        _db = client.db();
        console.log('Database is connected');
        return callback(null, _db);
    }).catch(err => {
        console.log(err);
        return callback(err, null);
    });
}

const getDb = () => {
    if (!_db)
    {
        throw Error('Database is not initialized');
    }
    return _db;
}

module.exports = {
    initDB,
    getDb
}