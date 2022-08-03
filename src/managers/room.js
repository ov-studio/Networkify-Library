/*----------------------------------------------------------------
     Resource: vNetworkify
     Script: managers: room.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 22/07/2022
     Desc: Room Manager
----------------------------------------------------------------*/


//////////////
// Imports //
//////////////

const CUtility = require("../utilities")
const CServer = require("./server")


//////////////////
// Class: Room //
//////////////////

CRoom = CUtility.createClass({
    buffer: {}
})
CServer.room = CRoom.public


/////////////////////
// Static Members //
/////////////////////

// @Desc: Verifies whether the room is void
CRoom.public.addMethod("isVoid", function(name) {
    return (CUtility.isString(name) && !CUtility.isObject(CRoom.public.buffer[name]) && true) || false
})

// @Desc: Fetches room instance by name
CRoom.public.addMethod("fetch", function(name) {
    return (!CRoom.public.isVoid(name) && CRoom.public.buffer[name]) || false
})

// @Desc: Creates a fresh room w/ specified name
CRoom.public.addMethod("create", function(name, ...cArgs) {
    if (!CServer.isConnected(true) || !CRoom.public.isVoid(name)) return false
    CRoom.public.buffer[name] = CRoom.public.createInstance(name, ...cArgs)
    return CRoom.public.buffer[name]
})

// @Desc: Destroys an existing room by specified name
CRoom.public.addMethod("destroy", function(name) {
    if (CRoom.public.isVoid(name)) return false
    return CRoom.public.buffer[name].destroy()
})


///////////////////////
// Instance Members //
///////////////////////

// @Desc: Instance constructor
CRoom.public.addMethod("constructor", function(self, name) {
    self.name = name
})

// @Desc: Destroys the instance
CRoom.public.addInstanceMethod("destroy", function(self) {
    delete CRoom.public.buffer[(self.name)]
    self.destroyInstance()
    return true
})