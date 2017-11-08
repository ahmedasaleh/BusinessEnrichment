var express             = require("express"),
    passport            = require("passport");
    // LocalStrategy       = require("passport-local");
var User                = require("../models/user");
var S                   = require('string');
var ValidatedUser       = require("../models/validatedUser");
var nodemailer = require('nodemailer'); 
var smtpConfig = {
    host: 'tedata.net',
    port: 25,
    secure: false, // upgrade later with STARTTLS
    auth: {
        user: 'bet@tedata.net.eg',
        pass: 'yourpassword'
    }
};
var APIAuthenticated = false;
var transporter = nodemailer.createTransport(smtpConfig);
// var transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'bet@tedata.net.eg',
//     pass: 'yourpassword'
//   }
// });

var mailOptions = {
  from: 'bet@tedata.net',
  to: 'myfriend@yahoo.com',
  subject: 'Activate your BET account'
};

var router              = express.Router();
//add routes
router.get("/home",function(request, response) {
    response.render("home");
});
router.get("/",function(request, response) {
    response.render("landing");
});
//PASS environment parameters
router.get("/getenv", function(req, res){
    res.json({ ip: process.env.IP, port: process.env.PORT });
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
    console.log(request.body.name);
    console.log(request.body.email);
    var newUser =new User({name: request.body.name, email: request.body.email});
    ValidatedUser.findOne({email: S(request.body.email).s},function(error,foundUser){
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
            User.register(newUser,request.body.password,function(error,user){
                if(error){
                    console.log("========================================= "+error);
                    request.flash("error",error.message);
                    return response.render("signup");
                }
                else{
                        //send email verification
                        var authenticationURL = "http://"+process.env.IP+":"+process.env.PORT+"/verify?authToken=" + user.authToken;
                        console.log("authenticationURL: "+authenticationURL);
                        console.log("to: "+user.email);
                        mailOptions.text = "Hi, you have signed for access to Business Enrichment Portal, please activate it by clicking on the following URL:\n"+authenticationURL;
                        transporter.sendMail(mailOptions, function(error, info){
                          if (error) {
                            console.log(error);
                          } else {
                            console.log('Email sent: ' + info.response);
                          }
                        }); 
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


router.post('/api/authenticate',  function (req, res) {
  key=req.query['apikey']; //get key from url
  //authenticate it
  if(key){
    User.findOne({ authToken: key }, function (err, user) {
        if (err) { 
            APIAuthenticated = false;
            res.json({ message: "unauthorized" }); 
        }
        else if(!user) { 
            APIAuthenticated = false;
            res.json({ message: "unauthorized" });
        }
        else {
            APIAuthenticated = true;
            console.log("isAPIAuthenticated=true");
            res.json({ message: "Authenticated" });
        }
    });

  }else{
    APIAuthenticated = false;
    res.json({ message: "unauthorized" });
  }
});

var isAPIAuthenticated = function(){
    return APIAuthenticated;
}

//logout ROUTE
router.get("/logout",function(request,response){
    request.logout();
    request.flash("success","logged you out");
    response.redirect("/login");
});

//show change password form
router.get("/changepass",function(request,response){
    response.render("changepassword");
});

router.post('/changepass' , function (request, res, next) {
     if (request.body.newpass !== request.body.newpassconfirm) {
        throw new Error('password and confirm password do not match');
     }

     var useremail = request.body.email;

     var newpass = request.body.newpass;

User.findOne({email: useremail},function(error,foundUser){
    if(error) {console.log(error);}
    else{
        foundUser.email = user;
        foundUser=newpass
        user.save(function(err){
         if (err) { next(err) }
         else {
             res.redirect('/home');
         }
     });

    }

});
     user.save(function(err){
         if (err) { next(err) }
         else {
             res.redirect('/home');
         }
     });
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
module.exports.isAPIAuthenticated = isAPIAuthenticated;