'use strict';

const http = require('http')
  , path = require('path')
  , express = require('express')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , config = require('../config');

var app = express()
  , port = config.port;

app.set('env', config.env);
app.locals.env = config.env;

app.set('views', __dirname + '/../views');
app.set('view engine', 'ejs');
app.enable('trust proxy');
app.engine('html', require('ejs').renderFile);
app.use(express.static(path.join(__dirname, '../../public')));
app.use(bodyParser.urlencoded({extended: true, limit: 4194304}));
app.use(bodyParser.json({type: 'application/json', limit: 4194304}));
app.use(cookieParser());

app.locals.cloudfront = '';

app.all('/hc', function(req, res) { res.send('OK'); });
app.all('*', function(req, res, next) { next(9999); });

app.use(errorHandler);

http.createServer(app).listen(port, function(){
  var date = (new Date()).toLocaleString();
  console.log('[' + date  + '] Express server listening on port ' + port + ' ' + app.get('env') + ' mode!');
});

function errorHandler(err, req, res, next) {
  var lang_id = (req.cookies ? req.cookies.lang_id : null) || req.query.lang_id || 17;

  var message = {
    3: 'موقعنا يخضع حاليا للصيانة. نعتذر عن الازعاج وسنعود خلال وقت قصير!',
    11: '修复中，请稍后',
    12: '修復中，請稍後!',
    17: 'Our site is currently undergoing maintenance. We apologize for the inconvenience and we will be back soon!',
    20: 'Notre site est en actuellement en cours de maintenance. Veuillez nous excuser pour la gêne occasionnée nous serons de retour bientôt!',
    22: 'An unserer Seite werden gerade Wartungsarbeiten getätigt. Wir bitten Sie um Entschuldigung für diese Unannehmlichkeit und wir werden bald wieder am Laufen sein!',
    27: 'Situs kami sedang dalam masa pemeliharaan. Kami minta maaf atas ketidaknyamanan dan kami akan segera kembali secepatnya!',
    29: 'Our site is currently undergoing maintenance. We apologize for the inconvenience and we will be back soon!',
    30: '今、サビースの点検になっております。ご迷惑をおかけして申し訳ございません。',
    33: '잠시 서비스 점검중입니다. 불편을 드려서 죄송합니다.',
    45: 'Nosso site está sob manutenção no momento. Pedimos desculpas pela inconveniência e logo estaremos de volta!',
    48: 'В настоящее время наш сайт находится на техническом обслуживании. Приносим свои извинения за доставленные неудобства. Ждите нас в скором времени!',
    52: 'Nuestro sitio se encuentra actualmente en mantenimiento. Pedimos disculpas por las molestias, ¡estaremos de vuelta pronto!',
    56: 'อยู่ในระหว่างปิดทำการปรับปรุงระบบ ขออภัยในความไม่สะดวก พบกันเร็วๆนี้',
    61: 'Trang web của chúng tôi hiện đang được bảo trì. Chúng tôi xin lỗi vì sự bất tiện này và chúng tôi sẽ quay trở lại sớm!'
  };
  var msg = message[lang_id] || message[17];

  var e = {statusCode: 403, body: {code: 9999, desc: msg, message: msg, resource: req.originalUrl, lang_id: lang_id}};
  if (req.originalUrl.substr(0, 5) === '/api/') {
    res.status(e.statusCode).send(e.body);
    return;
  }

  res.status(e.statusCode).render('error.html', {err: e.body, error_desc_msg: ''});
}

