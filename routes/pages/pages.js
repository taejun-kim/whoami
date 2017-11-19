'use strict';

exports.main = function(req, res) {
  res.render('index.html');
};

exports.timetable = function(req, res) {
  res.render('timetable/index.html');
};
