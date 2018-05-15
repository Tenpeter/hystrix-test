/**
 * hello
 *
 * GET: /hello
 *
 * query:
 *   name {string} The name of the person to whom to say hello.
 *
 */
 function helloTwo(name) {
   return new Promise(function(resolve, reject) {
     setTimeout(function () {
       resolve('Hello, ' + name);
     }, 1000);
   });
 }
 function isErrorHandler(e) {
   console.log('There was an error', e);
 }

 const CommandsFactory = require('hystrixjs').commandFactory;

 const serviceCommand = CommandsFactory.getOrCreate('testing')
          .circuitBreakerErrorThresholdPercentage(50)
          .timeout(5000)
          .circuitBreakerRequestVolumeThreshold(10)
          .circuitBreakerSleepWindowInMilliseconds(5000)
          .statisticalWindowLength(10)
          .statisticalWindowNumberOfBuckets(1000)
          .errorHandler((e) => {
            return isErrorHandler(e);
          })
          .run(helloTwo)
          .build();

exports.handler = async function hello(req, res, next) {
  const name = req.params.name;
  const msg = await serviceCommand.execute(name);
  res.send('hello, ' + msg);
  next()
}
