'use strict';

const express = require('express');
const router = express.Router();

const pages = require('./pages');

router.route('/')
  .get(pages.main);

router.route('/_')
  .get(function(req, res) {
    res.redirect('/');
  });

router.route('/hc')
  .get(function(req, res) {
    res.send('OK');
  });

exports.router = router;
