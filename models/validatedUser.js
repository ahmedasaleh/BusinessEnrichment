var mongoose                        = require("mongoose"),
    passportLocalMongooseEmail      = require("passport-local-mongoose-email");
    
var ValidatedUserSchema  = new mongoose.Schema({
    name: String,
    email: String,
    role: { type: String, default: "admin" },
    author: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String
    }
    
});
// ValidatedUserSchema.plugin(passportLocalMongooseEmail,{usernameField: 'email'});//User.serializeUser() and User.deserializeUser() are defined here

module.exports = mongoose.model("ValidatedUser",ValidatedUserSchema);