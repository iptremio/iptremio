const path = require('path');
const cors = require('cors');
const config = require('./config');
const express = require('express');
const database = require('./services/database');

const manifestRouter = require('./routes/manifest');
const catalogRouter = require('./routes/catalog');
const streamRouter = require('./routes/stream');
const redirectRouter = require('./routes/redirect');
const metaRouter = require('./routes/meta');
const configureRouter = require('./routes/configure');
const EpgJob = require('./cron/epgJob');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Apply config and XtreamClient middleware within each route file instead
app.use('/', manifestRouter); // Route for manifest
app.use('/', catalogRouter); // Route for catalog
app.use('/', streamRouter); // Route for stream
app.use('/', redirectRouter); // Route for redirect
app.use('/', metaRouter); // Route for meta
app.use('/', configureRouter); // Route for configure

app.listen(config.PORT, config.HOST, async () => {
    console.log(`Server running at ${config.BASE_URL}`);
    await database.connect();
    const epgJob = new EpgJob();
    epgJob.start();
});
