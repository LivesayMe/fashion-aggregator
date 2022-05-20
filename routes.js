var express = require('express');
const mongodb = require('./mongodb');
var mongo = require('mongodb');
var router = express.Router();



router.get('/', async function(req, res, next) {
  const results = await mongodb.getDb().collection('contacts').find().toArray();
  res.send(results);
});

module.exports = router;