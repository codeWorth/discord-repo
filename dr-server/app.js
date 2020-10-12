require("dotenv").config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var apiRouter = require('./src/routes/api');

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);

module.exports = app;
