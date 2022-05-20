const express = require("express");
const mongodb = require('./mongodb');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const bodyParser = require('body-parser');

const app = express()
const port = process.env.PORT || 3000;


app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(bodyParser.json());
app.use(cors({origin: "*"}));
app.use('/', require('./routes'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


mongodb.initDB((err, mongodb) => {
    if (err) {
        console.log(err);
        return;
    }
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    })
})
