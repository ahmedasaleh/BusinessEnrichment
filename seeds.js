var mongoose            = require("mongoose"),
    Device              = require("./models/device"),
    Interface           = require("./models/interface");
var user;

var data = [
    {
        hostname: "Maadi1", 
        ipaddress: "10.10.10.1",
        author: user
    },
    {
        hostname: "Maadi2", 
        ipaddress: "10.10.10.2",
        author: user
    },
    {
        hostname: "Maadi3", 
        ipaddress: "10.10.10.3",
        author: user
    },
    {
        hostname: "Maadi4", 
        ipaddress: "10.10.10.4",
        author: user
    },
    {
        hostname: "Maadi5", 
        ipaddress: "10.10.10.5",
        author: user
    },
    {
        hostname: "Maadi6", 
        ipaddress: "10.10.10.6",
        author: user
    },
    {
        hostname: "Maadi7", 
        ipaddress: "10.10.10.7",
        author: user
    },
    {
        hostname: "Maadi8", 
        ipaddress: "10.10.10.8",
        author: user
    },
    {
        hostname: "Maadi9", 
        ipaddress: "10.10.10.9",
        author: user
    },
    {
        hostname: "Maadi10", 
        ipaddress: "10.10.10.10",
        author: user
    },
    {
        hostname: "Maadi11", 
        ipaddress: "10.10.10.11",
        author: user
    },
    {
        hostname: "Maadi12", 
        ipaddress: "10.10.10.12",
        author: user
    },
    {
        hostname: "Maadi13", 
        ipaddress: "10.10.10.13",
        author: user
    },
    {
        hostname: "Maadi14", 
        ipaddress: "10.10.10.14",
        author: user
    },
    {
        hostname: "Maadi15", 
        ipaddress: "10.10.10.15",
        author: user
    },
    {
        hostname: "Maadi16", 
        ipaddress: "10.10.10.16",
        author: user
    },
    {
        hostname: "Maadi17", 
        ipaddress: "10.10.10.17",
        author: user
    },
    {
        hostname: "Maadi18", 
        ipaddress: "10.10.10.18",
        author: user
    },
    {
        hostname: "Maadi19", 
        ipaddress: "10.10.10.19",
        author: user
    },
    {
        hostname: "Maadi20", 
        ipaddress: "10.10.10.20",
        author: user
    },
    {
        hostname: "Maadi21", 
        ipaddress: "10.10.10.21",
        author: user
    },
    {
        hostname: "Maadi22", 
        ipaddress: "10.10.10.22",
        author: user
    },
    {
        hostname: "Maadi23", 
        ipaddress: "10.10.10.23",
        author: user
    },
    {
        hostname: "Maadi24", 
        ipaddress: "10.10.10.24",
        author: user
    },
    {
        hostname: "Maadi25", 
        ipaddress: "10.10.10.25",
        author: user
    },
    {
        hostname: "Maadi26", 
        ipaddress: "10.10.10.26",
        author: user
    },
    {
        hostname: "Maadi27", 
        ipaddress: "10.10.10.27",
        author: user
    },
    {
        hostname: "Maadi28", 
        ipaddress: "10.10.10.28",
        author: user
    },
    {
        hostname: "Maadi29", 
        ipaddress: "10.10.10.29",
        author: user
    },
    {
        hostname: "Maadi30", 
        ipaddress: "10.10.10.30",
        author: user
    },
    {
        hostname: "Maadi31", 
        ipaddress: "10.10.10.31",
        author: user
    },
    {
        hostname: "Maadi32", 
        ipaddress: "10.10.10.32",
        author: user
    }
    
]    


function seedDB(aUser){
    user = aUser;
    user = {id: aUser._id, email: aUser.email}
    // remove all devices and interfaces
    Device.remove({},function(error){
        if(error){
            console.log(error);
        }
        else{
            console.log("All Devices removed");
            //remove all interfaces
            Interface.remove({},function(error){
                if(error){
                    console.log(error);
                }
                else{
                    console.log("Removed all Interfaces successfully");
                }
            });
        }
    });
    
    // add a few devices and interfaces
    data.forEach(function(seed){
        seed.author = user;
        Device.create(seed,function(error,createdDevice){
            if(error){
                console.log(error);
            }
            else{
                console.log("added a device");
                //add a few interfaces
                Interface.create(
                    {
                        name: "g01_"+createdDevice.hostname,
                        author: user,
                        device: createdDevice
                    },function(error,createdInterface){
                        if(error){
                            console.log(error);
                        }
                        else{
                            console.log("created interfaces");
                            createdDevice.interfaces.push(createdInterface);
                            createdDevice.save();
                        }
                    
                });
            }
        });
    });

}
module.exports  = seedDB;