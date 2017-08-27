var winston = require('winston');
const fs = require('fs');
const tsFormat = () => (new Date()).toLocaleTimeString();
const logDir = '/Users/IBM_ADMIN/nodejsWS/BusinessEnrichment/log/';
// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

let mainLogger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
  ]
});

class CustomTransport extends winston.Transport {
  constructor(options) {
    super(options);
    this.name = 'customLogger';
    this.level = options && options.level || 'delete';
    this.levelOnly = options && options.levelOnly;
    // this.levels = options && options.levels || [];
    this.levels = options && options.levels ;
  }

  log(level, msg, meta, callback) {
    if (!this.levelOnly || this.levels.indexOf(level) > -1) {
      console.log("zzzzzzzzzzzzzz");
      mainLogger[level](msg, meta);
    }
    callback(null, true);
  }
}

winston.transports.CustomTransport = CustomTransport;

let myLogger = new winston.Logger({
  transports: [
    new (winston.transports.CustomTransport)({
      // levelOnly: true,
      levels: ['delete']
    }),
  ]
});

// myLogger.delete('will be logged');

var myCustomLevels = {
    levels: {
      delete: 8
    },
    colors: {
      delete: 'red'
    }
  };
myLogger.afunc = function(){
  myLogger;
}
// var deleteLogger = new (winston.Logger)({ 
//   levelOnly: true,
// 	levels: myCustomLevels.levels
//     // transports: [
//     //   new winston.transports.Console({
//     //     timestamp: new Date(),
//     //     colorize: true,
//     //   }),
//     //   new winston.transports.File({
//     //     name: 'deleteLogger',
//     //     filename: logDir+'/delete.log',
//     //     timestamp: new Date(),
//     //     datePattern: 'yyyy-MM-dd'
//     //   })
//     // ]
// });

module.exports = myLogger;
