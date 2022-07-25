/*----------------------------------------------------------------
     Resource: vNetworkify
     Script: managars: socket: room.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 22/07/2022
     Desc: Socket: Room Manager
----------------------------------------------------------------*/


//////////////
// Imports //
//////////////

const CUtility = require("../../utilities")
const CServer = require("../server")


///////////////////////
// Instance Members //
///////////////////////

CServer.socket.addInstanceMethod("isRoom", function(self, name) {
    const cInstance = (CUtility.isString(name) && CUtility.isObject(self.room[name]) && self.room[name]) || false
    if (CUtility.isServer && cInstance && !cInstance.isInstance()) cInstance = false
    return (cInstance && true) || false
})

CServer.socket.addInstanceMethod("isInRoom", function(self, name, client) {
    if (!self.isRoom(name)) return false
    if (CUtility.isServer) {
        if (!self.isClient(client)) return false
        const vid = CUtility.fetchVID(client)
        return (self.room[name].member[vid] && true) || false   
    }
    const vid = CUtility.fetchVID(self)
    return (self.room[name][vid] && true) || false
})

if (!CUtility.isServer) {

}
else {
    ///////////////////////
    // Instance Members //
    ///////////////////////

    CServer.socket.addInstanceMethod("createRoom", function(self, name, ...cArgs) {
        if (self.isRoom(name)) return false
        self.room[name] = CServer.room.create(`Socket:${CUtility.fetchVID(self)}:${name}`, ...cArgs)
        self.room[name].member = {}
        return true
    })

    CServer.socket.addInstanceMethod("destroyRoom", function(self, name) {
        if (!self.isRoom(name)) return false
        self.room[name].destroy()
        delete self.room[name]
        return true
    })

    CServer.socket.addInstanceMethod("joinRoom", function(self, name, client) {
        if (!self.isClient(client) || !self.isRoom(name) || self.isInRoom(name, client)) return false
        const vid = CUtility.fetchVID(client)
        self.room[name].member[vid] = true
        return true
    })

    CServer.socket.addInstanceMethod("emitRoom", function(self, name, network, ...cArgs) {
        if (!self.isRoom(name)) return false
        for (const i in self.room[name].member) {
            self.emit(network, self.instance[i], ...cArgs)
        }
        return true
    })
}