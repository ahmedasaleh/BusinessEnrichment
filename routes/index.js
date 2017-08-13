var express             = require("express"),
    passport            = require("passport"),
    LocalStrategy       = require("passport-local");
var User                = require("../models/user");
var ValidatedUser       = require("../models/validatedUser");
var router              = express.Router();
//add routes
router.get("/home",function(request, response) {
    response.render("home");
});
router.get("/",function(request, response) {
    response.render("landing");
});
//======================
// AUTH ROUTES
//======================
//show register Form
router.get("/signup",function(request,response){
    response.render("signup");
});
//handle signup logic
router.post("/signup",function(request,response){
    var newUser =new User({name: request.body.name, email: request.body.email});
    ValidatedUser.findOne({email: request.body.email},function(error,foundUser){
        console.log(foundUser);
        if(error){
            request.flash("error",error);
            return response.render("signup");
        }
        else if(foundUser == null){
            request.flash("error","User not allowed");
            return response.render("email-error");
        }
        else{
            console.log(request.body);
            User.register(newUser,request.body.password,function(error,user){
                if(error){
                    console.log("========================================= "+error);
                    request.flash("error",error.message);
                    return response.render("signup");
                }
                else{
                        //send email verification
                        var authenticationURL = 'http://0.0.0.0:8080/verify?authToken=' + user.authToken;
                        console.log("authenticationURL: "+authenticationURL);
                        console.log("to: "+user.email);
                        //sendgrid.send({
                        //to:       account.email,
                        //from:     'emailauth@yourdomain.com',
                        //subject:  'Confirm your email',
                        //html:     '<a target=_blank href=\"' + authenticationURL + '\">Confirm your email</a>'
                        //}, function(err, json) {
                        //if (err) { return console.error(err); }
                        //res.redirect('/email-verification');
                        //});
                        response.redirect('/email-verification');
                }
            });    
        }
    });
});

router.get('/email-verification', function(request, response) {
    response.render('email-verification', {title: 'Email verification sent!'})
});

router.get('/verify', function(request, response) {
    User.verifyEmail(request.query.authToken, function(error, existingAuthToken) {
        if(error){
            console.log('error:', error);
        }
        else{
            console.log("Successfully signed Up :) "+ request.body);
            //request.flash("success","Hi "+request.body.name+", Welcome to the Business Enrichment Portal");
            response.render('email-verification', { title : 'Email verified succesfully!' });
        }
    });
});

//show login form
router.get("/login",function(request,response){
    response.render("login");
});

// handling login logic
router.post("/login",passport.authenticate('local',{
    successRedirect: "/home",
    failureRedirect: "/login"
}));

//logout ROUTE
router.get("/logout",function(request,response){
    request.logout();
    request.flash("success","logged you out");
    response.redirect("/login");
});


//middleware
function isLoggedIn(request,response,next){
    if(request.isAuthenticated()){
        return next();
    }
    request.flash("error", "You need to be logged in to do that");
    response.redirect("/login");
}

module.exports = router;