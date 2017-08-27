var winston = require('winston');
const fs = require('fs');
const tsFormat = () => (new Date()).toLocaleTimeString();
const logDir = '/Users/IBM_ADMIN/nodejsWS/BusinessEnrichment/log/';
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
        timestamp: new Date(),
        datePattern: 'yyyy-MM-dd'
      })
    ]
  });

module.exports = logger;
