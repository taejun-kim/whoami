'use strict';

const config = require('./config');
global.config = config;

if (config.env === 'maintenance') { // maintenance 모드
  require('./utils/maintenance');
  return;
}

const express = require('express')
  , helmet = require('helmet')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , logger = require('morgan')
  , ejs = require('ejs')
  , fs = require('fs')
  , http = require('http')
  , path = require('path')
  , useragent = require('useragent')
  , errorHandler = require('errorhandler')
  , fetcher = require('express-param')
  , favicon = require('serve-favicon');

const app = express()
  , port = config.port;

const error = require('./utils/error');

http.createServer(app).listen(port, function () {
  console.log('[' + (new Date()).toLocaleString() + '] Express server listening on port ' + port + ' ' + app.get('env') + ' mode!');
});

const NODE_ENV = process.env.NODE_ENV || process.env.JUNIT_REPORT_PATH;

function configApp(env, mode) {
  app.use(handleUnknownIP);
  app.set('env', env);
  app.locals.env = env;
  app.set('mode', mode);
  app.locals.mode = mode;
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.enable('trust proxy');
  app.engine('html', require('ejs').renderFile);
  app.use(bodyParser.urlencoded({extended: true, limit: 4194304}));
  app.use(bodyParser.json({type: 'application/json', limit: 4194304}));

  app.use(fetcher({user: 'user', ipaddr: 'ip', 'x-fetcher-geoinfo': 'geo-info', isChina: 'isChina'},
    {geoip: {keyName: (env === 'production' ? 'headers.x-forwarded-for' : 'ip')}, imsi: true}));


  app.use(cookieParser());
  app.use(helmet());

  app.use(parseUserAgentAndUser);

  setLogger();

  app.use(express.static(path.join(__dirname, './public')));
  app.use(favicon(path.join(__dirname,'public','images','favicon.ico')));

  require('./routes').routes(app);

  app.use(function(req, res, next) { next({ code: 404, msg: 'uri is not found' }); });  // not exists in router and static folder
  app.use(error.handler);

  if (env === 'development')
    app.use(errorHandler({showStack: true, dumpExceptions: true}));
  else
    app.use(errorHandler());
}

function handleUnknownIP(req, res, next) {
  let xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor && xForwardedFor.match('unknown')) req.headers['x-forwarded-for'] = xForwardedFor.replace('unknown, ', '');
  return next();
}

function parseUserAgentAndUser(req, res, next) {
  let ua = req.headers['user-agent'] || '';
  req['user-agent'] = ua;
  res.locals.isApp = (ua.indexOf('Dalvik')===0 || ua === 'Mozilla/5.0');

  ua = useragent.parse(ua);

  let os = ua.os.family;
  res.locals.isMobile = (os === 'Android' || os === 'iOS' || os === 'BlackBerry OS' || os === 'Windows Phone OS');
  res.locals.os = os;
  res.locals.browser = ua.family;
  res.locals.isIE = ua.family === 'IE';
  res.locals.ltIE9  = (ua.family === 'IE' && ua.major < 9);
  res.locals.ltIE10 = (ua.family === 'IE' && ua.major < 10);
  res.locals.isSafari = ua.family === 'Safari';

  if (req.session && req.session.user) {
    req.user = req.session.user;
  } else {
    req.user = null;
  }

  next();
}

function setLogger() {
  if (global.mocha)
    return;

  if (!global.NO_STDOUT_LOG)    // stdout log 출력 확인
    app.use(logger('dev'));

  const log_file = fs.createWriteStream(path.normalize(config.log_dir + '/access.log'), {flags: 'a'});

  // resp-time 이 오래 걸리는 request를 output.log에 남김
  logger.token('slow-response', function(req, res){
    if (req._startAt && res._startAt) {
      let ms = (res._startAt[0] - req._startAt[0]) * 1e3
        + (res._startAt[1] - req._startAt[1]) * 1e-6;
      ms = parseInt(ms);

      if (ms < 10000) return '';

      let str = 'resp-time: ' + ms + 'ms, ' + req.ip + ' '
        + ' "' + req.method + ' ' + req.originalUrl + ' HTTP/' + req.httpVersion + '" ' + (res.statusCode || ' - ')
        + ' ' + req['user-agent'];
      if ((req.method == 'POST' || req.method == 'PUT') && typeof req.body == 'object')
        str += '\n' + JSON.stringify(req.body || {}).substr(0, 128);

      console.log('[SLOW RESP] ' + str);
    }
    return '';
  });

  const format = ':remote-addr [:date[iso]] ":method :url HTTP/:http-version" :status'
    + ' :res[content-length] ":referrer" ":user-agent" :response-time :slow-response';
  app.use(logger(format, {stream: log_file}));
}

configApp(config.env || 'development', config.mode || 'global');

module.exports = app;
