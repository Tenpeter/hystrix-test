'use strict';

var SwaggerRestify = require('swagger-restify-mw');
const swaggerRoutes = require('swagger-routes');
var restify = require('restify');
const CookieParser = require('restify-cookies');
const neoAsync = require('neo-async');
var app = restify.createServer();
const hystrixSSEStream = require('hystrixjs').hystrixSSEStream;

function hystrixStreamResponse(request, response) {
    response.append('Content-Type', 'text/event-stream;charset=UTF-8');
    response.append('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
    response.append('Pragma', 'no-cache');
    return hystrixSSEStream.toObservable().subscribe(
        function onNext(sseData) {
            response.write('data: ' + sseData + '\n\n');
        },
        function onError(error) {console.log(error);
        },
        function onComplete() {
            return response.end();
        }
    );
};

app.get('/api/hystrix.stream', hystrixStreamResponse);

module.exports = app; // for testing

var config = {
  appRoot: __dirname // required config
};

/* Helper function that parallelizes most of the required Restify Middleware */
function parallelize(middlewares) {
  return function (req, res, next) {
    neoAsync.each(middlewares, function (mw, cb) {
      mw(req, res, cb);
    }, next);
  };
}

app.use(restify.plugins.bodyParser());
app.use(restify.plugins.conditionalRequest());

const parrallelMiddleware = [
restify.plugins.acceptParser(app.acceptable),
restify.plugins.authorizationParser(),
restify.plugins.dateParser(),
restify.plugins.queryParser(),
restify.plugins.jsonp(),
restify.plugins.requestLogger(),
restify.plugins.fullResponse(),
CookieParser.parse
];

app.use(parallelize(parrallelMiddleware));
/* Register Swagger api with Restify routes */
  swaggerRoutes(app, {
    api: './api/swagger/swagger.yaml',
    handlers: {
      path: './api/controllers',
      generate: true
    }
  });

SwaggerRestify.create(config, function(err, swaggerRestify) {
  if (err) { throw err; }

  swaggerRestify.register(app);

  var port = process.env.PORT || 10010;
  app.listen(port);

  if (swaggerRestify.runner.swagger.paths['/hello']) {
    console.log('try this:\ncurl http://127.0.0.1:' + port + '/hello?name=Scott');
  }
});
