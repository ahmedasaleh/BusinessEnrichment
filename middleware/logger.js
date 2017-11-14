var winston = require('winston');
var dateFormat        = require('dateformat');
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
        filename: logDir+'/bet_'+dateFormat(new Date(),"dd-mm-yyyy_HH-MM-ss")+'.log',
        maxsize:'1048576',
        maxFiles:'100',
        timestamp: new Date(),
        datePattern: 'yyyy-MM-dd',
        formatter: function(options) {
          // Return string will be passed to logger. 
          return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
        }
      })
    ]
  });

module.exports = logger;
