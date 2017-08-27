var mongoose                        = require("mongoose"),
	// bcrypt							= require("bcrypt");
    passportLocalMongooseEmail      = require("passport-local-mongoose-email");
    
var UserSchema  = new mongoose.Schema({
    name: String,
    // email: String,
    password: String,
    role: { type: String, default: "admin" }
});

// bcrypt middleware
UserSchema.pre('save', function(next){
    var user = this;

    //check if password is modified, else no need to do anything
    if (!user.isModified('pass')) {
       return next()
    }

    user.pass = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    next()
})

UserSchema.plugin(passportLocalMongooseEmail,{usernameField: 'email'});//User.serializeUser() and User.deserializeUser() are defined here

module.exports = mongoose.model("User",UserSchema);