var winston = require('winston');
const fs = require('fs');
const tsFormat = () => (new Date()).toLocaleTimeString();
const logDir = __dirname+"/.." +"/log/";
// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = new winston.Logger({
    level: 'verbose',
    transports: [
      new winston.transports.Console({
        timestamp: new Date(),
        colorize: true,
      }),
      new winston.transports.File({
      	name: 'appLogger',
        filename: logDir+'/bet.log',
        maxsize:'1048576',
        maxFiles:'10',
        timestamp: new Date(),
        datePattern: 'yyyy-MM-dd'
      })
    ]
  });

module.exports = logger;
