const winston = require('winston')
  , path = require('path')
  , config = require('../config');

const logPath = path.normalize(config.log_dir + '/50x.log')
  , logger = new (winston.Logger)({
  transports: [ new (winston.transports.File)({filename: logPath, maxsize: 1024 * 1024 * 100, json: false}) ]
});

exports.handler = function (err, req, res, next) {
  if (!err) return next();

  let errStr = (err instanceof Error)? err : JSON.stringify(err)
    , access_log;

  console.log('\n####################');
  console.log('# err: ' + errStr);

  if (config.env === 'development' && err instanceof Error)
    console.log(err.stack);

  let code = getCode(err);
  console.log('# code: ' + code);

  let opt = {code: code, resource: req.originalUrl};
  if (typeof err === 'object' && err.hasOwnProperty('data'))
    opt.additional = err.data;

  let e = getError(opt);
  console.log(e);

  // In case, statusCode 400
  if (e.statusCode >= 400) {
    access_log = req.ip + ' - - [' + new Date() + '] '
      + req.method + ' ' + req.originalUrl + ' ' + e.statusCode + '(' + code + ')'
      + ' (' + res.locals.os + ') ' + req.headers['user-agent'];

    console.log(access_log);
    if (req.method === 'POST' || req.method === 'PUT')
      console.log('[ body ]\n', req.body);

    console.log('[ cookies ]\n', req.cookies);
    console.log('[ session ]\n', req.session);
  }
  console.log('####################');

  // In case, statusCode 500
  if (e.statusCode >= 500) {
    let logStr = '\n-----------------\n';
    logStr += access_log + '\n';
    logStr += '[err]' + errStr + '\n';
    if (err instanceof Error)
      logStr += '[err.stack]' + err.stack + '\n';
    logStr += '[e]' + JSON.stringify(e) + '\n';
    logStr += '[body]' + JSON.stringify(reduceObjPropertyLength(req.body)) + '\n';
    logStr += '[cookies]' + JSON.stringify(reduceObjPropertyLength(req.cookies)) + '\n';
    logStr += '[session]' + JSON.stringify(req.session) + '\n';
    logStr += '-----------------\n';
    logger.info(logStr);
  }
  res.status(e.statusCode).send(e.body);
};

function reduceObjPropertyLength(obj, len) {
  if (typeof obj !== 'object') return obj;
  if (!obj) return obj;

  len = len || 100;
  var newObj = {}
    , val;
  for (var k in obj) {
    if (!obj.hasOwnProperty(k)) continue;

    val = obj[k];
    if (typeof val === 'string')
      newObj[k] = val.length > len ? val.substr(0, len) + '..' : val;
    else
      newObj[k] = val;
  }

  return newObj;
}

function getCode(err) {
  if (!isNaN(err))
    return err;

  let code = 5002;
  if ('object' === typeof err) {
    if (err.code || err.status) {
      code = err.code || err.status;  // err.status in some os (because of auto converting)
    }
  }
  if (isNaN(code)) {
    console.log('## ERROR ## => 5002');
    code = 5002;
  }

  return code;
}

const getError = exports.getError = function(obj) {
  let resource = obj.resource;
  let code, statusCode, desc, message, result;

  statusCode = 500;
  code = 500;
  desc = 'Internal server error. Please try again later.';
  message = 'Internal server error. Please try again later.';
  result = {statusCode: statusCode, body: {code: code, desc: desc, message: message, resource: resource}};

  return result;
};
