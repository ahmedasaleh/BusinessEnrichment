//require
var express             = require("express"),
    bodyParser          = require("body-parser"),
    mongoose            = require("mongoose"),
    flash               = require("connect-flash"),
    passport            = require("passport"),
    LocalStrategy       = require("passport-local"),
    methodOverride      = require("method-override"),
    dotenv              = require("dotenv"),
    User                = require("./models/user"),
    logger              = require('./middleware/logger'),//logging component
    S                   = require("string");
    // deleteLogger           = require('./middleware/deleteLogger'),//logging component
    seedDB              = require("./seeds");

var winston = require('winston');
var fileUpload = require('express-fileupload');
var parser              = require("./middleware/parser/parser");
var responseHandler = require('express-response-handler');

var CronJob = require('cron').CronJob;   

var cluster = require('cluster');    
//requiring routes
var interfaceRoutes       = require("./routes/interfaces"),  
    popRoutes    = require("./routes/pops"),  
    sectorRoutes    = require("./routes/sectors"),  
    governorateRoutes    = require("./routes/governorates"),  
    linkRoutes    = require("./routes/links"),  
    userRoutes    = require("./routes/users"),  
    validatedUserRoutes    = require("./routes/validatedUsers"),  
    deviceRoutes    = require("./routes/devices"),  
    enrichmentRoutes    = require("./routes/enrichments"),  
    indexRoutes     = require("./routes/index"); 

var indexBaseURL        = "/",
    popBaseURL   = "/pops",
    sectorBaseURL   = "/sectors",
    governorateBaseURL   = "/governorates",
    linkBaseURL   = "/links",
    userBaseURL   = "/users",
    validatedUserBaseURL   = "/validatedusers",
    deviceBaseURL   = "/devices",
    enrichmentBaseURL   = "/enrichments",
    interfaceBaseURL      = "/interfaces";
    // interfaceBaseURL      = "/devices/:id/interfaces";

var applicationVersion  = 1;
var option = {
    server: {
        socketOptions: {
            keepAlive: 300000,
            connectTimeoutMS: 60000
        }
    },
    replset: {
        socketOptions: {
            keepAlive: 300000,
            connectTimeoutMS: 60000
        }
    }
};
// var mongoURI = S("mongodb://localhost/"+process.env.DEV_DB).s;
// var mongoURI = "mongodb://localhost/auth_demo_app";
//inistantiate app
customCodes = [['Unauthorized', 'error', 401]];
dotenv.config();
var app = express();
app.set("view engine", "ejs");
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));
app.use(flash());

app.use(bodyParser.urlencoded({extended: true}));
mongoose.Promise = global.Promise; //to vercome the warning about Mongoose mpromise

mongoose.connect("mongodb://localhost/"+process.env.DEV_DB, {useMongoClient: true});
// mongoose.connect("mongodb://localhost/auth_demo_app", {useMongoClient: true});
// mongoose.connect(mongoURI, option).then(function(){
//     logger.info("connected successfully to mongo server");
// }, function(err) {
//     logger.error("failed to connect to mongo server");
// });
//seedDB();

// app.use(responseHandler(customCodes)).get('/', (req, res) => {
//         let data = {
//             errors: []
//         };
 
//         // Recommended way 
//         res.error.Unauthorized('permission.error.unauthorized', data);
 
//         // Also available with the same result 
//         res.error('Unauthorized', 'permission.error.unauthorized', data);
//         res.error(401, 'permission.error.unauthorized', data);
//         res.error[401]('permission.error.unauthorized', data);
// });
//Passport configuration
app.use(require("express-session")({
    secret: "should_ContainZ__nUMber851 PsUWtooN lenovo Targus w500 pM YouroPtions LImited",
    resave: false,
    saveUninitialized: false
}));
app.use(fileUpload());
app.use(passport.initialize());
app.use(passport.session());
//passport.use(new LocalStrategy(User.authenticate()));
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());//read the session, take the data from the session and encode it, serialze it and put it back in the session
passport.deserializeUser(User.deserializeUser());//read the session, taking the data from the session that's encoded and decode it

//run this middleware for every single route, it passes the current user to the route
//it must be after passport initialization
app.use(function(request,response,next){
    response.locals.currentUser = request.user;
    response.locals.error       = request.flash("error");
    response.locals.success     = request.flash("success");
    response.locals.warning     = request.flash("warning");
    next();
});

app.use(indexBaseURL, indexRoutes);
app.use(deviceBaseURL, deviceRoutes);
app.use(interfaceBaseURL, interfaceRoutes);
app.use(popBaseURL, popRoutes);
app.use(sectorBaseURL, sectorRoutes);
app.use(governorateBaseURL, governorateRoutes);
app.use(userBaseURL, userRoutes);
app.use(linkBaseURL, linkRoutes);
app.use(validatedUserBaseURL, validatedUserRoutes);
app.use(enrichmentBaseURL, enrichmentRoutes);
//start server
process.on('uncaughtException', function (err) {
  console.error(err);
  console.log("Node NOT Exiting...");
});

//sec min hour day month weekday
new CronJob('0 0 0 */2 * *', function() {
  console.log('Automatic sync for devices runs every 48 hrs');
  console.log("current syncing time is: "+ new Date());
  deviceRoutes.syncDevices();
}, null, true, 'Africa/Cairo');


app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Business Enrichment V"+ applicationVersion +" Server Started on "+process.env.IP+":"+process.env.PORT);
    console.log("current time is: "+ new Date());
    console.log(process.env.UV_THREADPOOL_SIZE);
});


