exports.routes = function (app) {

  // no cache header
  const ext = 'jpg|jpeg|gif|png|ico|css|zip|tgz|gz|rar|bz2|pdf|txt|tar|wav|bmp|rtf|js|flv|swf|html|htm|less';
  const reg = new RegExp('^[^\\.]*$|\\.(?!(?:' + ext + ')$)', 'i');

  app.get(reg, function(req,res,next){
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '-1');
    next();
  });

  const pages = require('./pages');
  app.use('/', pages.router);
};

