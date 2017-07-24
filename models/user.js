var mongoose                        = require("mongoose"),
    passportLocalMongooseEmail      = require("passport-local-mongoose-email");
    
var UserSchema  = new mongoose.Schema({
    name: String,
    // email: String,
    password: String,
    role: { type: String, default: "admin" }
});
UserSchema.plugin(passportLocalMongooseEmail,{usernameField: 'email'});//User.serializeUser() and User.deserializeUser() are defined here

module.exports = mongoose.model("User",UserSchema);