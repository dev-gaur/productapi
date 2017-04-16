
function noOp(dbconnection) {
    console.log("Its about time to meet my creator.")
    dbconnection.end();
};


module.exports = function(callback, dbconnection) {

  // attach user callback to the process event emitter
  // if no callback, it will still exit gracefully on Ctrl-C

  callback = callback ? callback.bind(null, dbconnection) : noOp.bind(null, dbconnection);

  process.on('cleanup',callback);

  // do app specific cleaning before exiting
  process.on('exit', function () {
    process.emit('cleanup');
  });

  // catch ctrl+c event and exit normally
  process.on('SIGINT', function () {
    console.log('Ctrl-C...');
    process.exit(2);
  });

  //catch uncaught exceptions, trace, then exit normally
  process.on('uncaughtException', function(e) {
    console.log('Uncaught Exception...');
    console.log(e.stack);
    process.exit(99);
  });
};