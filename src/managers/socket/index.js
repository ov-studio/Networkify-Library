/*----------------------------------------------------------------
     Resource: vNetworkify
     Script: managers: socket: index.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 22/07/2022
     Desc: Socket Manager
----------------------------------------------------------------*/


//////////////
// Imports //
//////////////

const CWS = require("ws")
const CUtility = require("../../utilities")
const CServer = require("../server")


////////////////////
// Class: Socket //
////////////////////

CServer.socket = CUtility.createClass({
    buffer: {}
})


/////////////////////
// Static Members //
/////////////////////

// @Desc: Verifies socket's validity
CServer.socket.addMethod("isVoid", function(route) {
    return (CUtility.isString(route) && !CUtility.isObject(CServer.socket.buffer[route]) && true) || false
})

// @Desc: Fetches socket instance by route
CServer.socket.addMethod("fetch", function(route) {
    return (!CServer.socket.isVoid(route) && CServer.socket.buffer[route]) || false
})

// @Desc: Fetches an array of existing sockets
CServer.socket.addMethod("fetchSockets", function() {
    const result = {}
    for (const i in CServer.socket.buffer) {
        if (CServer.socket.fetch(i)) result[i] = CServer.socket.buffer[i]
    }
    return result
})

// @Desc: Creates a fresh socket w/ specified route
CServer.socket.addMethod("create", function(route) {
    if (!CServer.isConnected(true) || !CServer.socket.isVoid(route)) return false
    CServer.socket.buffer[route] = new CServer.socket(route)
    return CServer.socket.buffer[route]
})

// @Desc: Destroys an existing socket by specified route
CServer.socket.addMethod("destroy", function(route) {
    if (CServer.socket.isVoid(route)) return false
    CServer.socket.buffer[route].isUnloaded = true
    if (CUtility.isServer) {
        for (const i in CServer.socket.buffer[route].instance) {
            const j = CServer.socket.buffer[route].instance[i]
            for (const k in j.queue) {
                const v = j[k]
                v.reject()
            }
        }
        for (const i in CServer.socket.buffer[route].room) {
            CServer.socket.buffer[route].destroyRoom(i)
        }
    }
    for (const i in CServer.socket.buffer[route].network) {
        CServer.socket.buffer[route].destroyNetwork(i)
    }
    delete CServer.socket.buffer[route]
    return true
})


///////////////////////
// Instance Members //
///////////////////////

// @Desc: Verifies instance's validity
CServer.socket.addInstanceMethod("isInstance", function(self) {
    return (!self.isUnloaded && !CServer.socket.isVoid(self.route) && true) || false
})

// @Desc: Destroys the instance
CServer.socket.addInstanceMethod("destroy", function(self) {
    self.server.close()
    for (const i in self.network) {
        const j = self.network[i]
        j.destroy()
    }
    CServer.socket.destroy(this.route)
    return true
})

if (!CUtility.isServer) {
    /////////////////////
    // Static Members //
    /////////////////////

    // @Desc: Instance Constructor
    CServer.socket.addMethod("constructor", function(self, route) {
        CUtility.fetchVID(self)
        self.config = {
            isConnected: false
        }
        self.route = route
        self.queue = {}, self.network = {}, self.room = {}
        self.connect = function() {
            if (self.isConnected()) return false
            var cResolver = false
            self.config.isAwaiting = new Promise((resolver) => cResolver = resolver)
            self.server = new WebSocket(`${((CServer.config.protocol == "https") && "wss") || "ws"}://${CServer.config.hostname}:${CServer.config.port}/${self.route}`)
            self.server.onopen = function() {
                self.config.isAwaiting = null
                self.config.isConnected = true
                cResolver(self.config.isConnected)
                return true
            }
            self.server.onclose = function() {
                if (CUtility.isFunction(self.onClientDisconnect)) self.onClientDisconnect(CUtility.fetchVID(self.server, null, true) || false)
                return true
            }
            self.server.onerror = function(error) {
                console.log(error)
                self.config.isConnected = false
                cResolver(self.config.isConnected)
                self.connect()
                return true
            }
            self.server.onmessage = function(payload) {
                payload = JSON.parse(payload.data)
                if (!CUtility.isObject(payload)) return false
                if (!CUtility.isString(payload.networkName) || !CUtility.isArray(payload.networkArgs)) {
                    if (payload.client) {
                        CUtility.fetchVID(self.server, payload.client)
                        if (CUtility.isFunction(self.onClientConnect)) self.onClientConnect(payload.client)
                    }
                    else if (payload.room) {
                        if (payload.action == "join") {
                            const client = CUtility.fetchVID(self.server, null, true)
                            self.room[(payload.room)] = self.room[(payload.room)] || {}
                            self.room[(payload.room)].member = self.room[(payload.room)].member || {}
                            self.room[(payload.room)].member[client] = true
                            if (CUtility.isFunction(self.onClientJoinRoom)) self.onClientJoinRoom(payload.room, client)
                        }
                        else if (payload.action == "leave") {
                            delete self.room[(payload.room)]
                            if (CUtility.isFunction(self.onClientLeaveRoom)) self.onClientLeaveRoom(payload.room, client)
                        }
                    }
                    return false
                }
                if (CUtility.isObject(payload.networkCB)) {
                    if (!payload.networkCB.isProcessed) {
                        payload.networkCB.isProcessed = true
                        const cNetwork = CServer.socket.fetchNetwork(self, payload.networkName)
                        if (!cNetwork || !cNetwork.isCallback) payload.networkCB.isErrored = true
                        else payload.networkArgs = [cNetwork.handler.exec(...payload.networkArgs)]
                        self.server.send(JSON.stringify(payload))
                    }
                    else CServer.socket.resolveCallback(self, null, payload)
                    return true
                }
                self.emit(payload.networkName, null, ...payload.networkArgs)
                return true
            }
        }
        self.connect()
    })


    ///////////////////////
    // Instance Members //
    ///////////////////////

    // @Desc: Retrieves connection's status of instance
    CServer.socket.addInstanceMethod("isConnected", function(self, isSync) {
        if (isSync) return (CUtility.isBool(self.config.isConnected) && self.config.isConnected) || false
        return self.config.isAwaiting || self.config.isConnected || false
    })
}
else {
    /////////////////////
    // Static Members //
    /////////////////////

    // @Desc: Instance Constructor
    CServer.socket.addMethod("constructor", function(self, route) {
        CUtility.fetchVID(self)
        self.route = route, self.network = {}
        self.instance = {}, self.room = {}
        self.server = new CWS.Server({
            noServer: true,
            path: `/${self.route}`
        })
        CServer.instance.CHTTP.on("upgrade", function(request, socket, head) {
            self.server.handleUpgrade(request, socket, head, (socket) => self.server.emit("onClientConnect", socket, request))
        })
        self.server.on("onClientConnect", function(socket, request) {
            var [instance, query] = request.url.split("?")
            instance = CServer.socket.fetch(instance.slice(1))
            if (!instance) return false
            const clientInstance = CServer.socket.client.create(socket)
            const client = CUtility.fetchVID(clientInstance, null, true)
            self.instance[client] = clientInstance
            clientInstance.queue = {}, clientInstance.room = {}
            query = CUtility.queryString.parse(query)
            clientInstance.socket.send(JSON.stringify({client: client}))
            if (CUtility.isFunction(self.onClientConnect)) self.onClientConnect(client)
            clientInstance.socket.onclose = function() {
                for (const i in clientInstance.socket.room) {
                    self.leaveRoom(i, client)
                }
                delete self.instance[client]
                if (CUtility.isFunction(self.onClientDisconnect)) self.onClientDisconnect(client)
                return true
            }
            clientInstance.socket.onmessage = function(payload) {
                payload = JSON.parse(payload.data)
                if (!CUtility.isObject(payload) || !CUtility.isString(payload.networkName) || !CUtility.isArray(payload.networkArgs)) return false
                if (CUtility.isObject(payload.networkCB)) {
                    if (!payload.networkCB.isProcessed) {
                        payload.networkCB.isProcessed = true
                        const cNetwork = CServer.socket.fetchNetwork(self, payload.networkName)
                        if (!cNetwork || !cNetwork.isCallback) payload.networkCB.isErrored = true
                        else payload.networkArgs = [cNetwork.handler.exec(...payload.networkArgs)]
                        clientInstance.socket.send(JSON.stringify(payload))
                    }
                    else CServer.socket.resolveCallback(self, client, payload)
                    return true
                }
                self.emit(payload.networkName, null, ...payload.networkArgs)
                return true
            }
        })
    }, "isInstance")

    
    ///////////////////////
    // Instance Members //
    ///////////////////////

    // @Desc: Verifies client's validity
    CServer.socket.addInstanceMethod("isClient", function(self, client) {
        return (CServer.socket.client.fetch(client) && self.instance[client] && true) || false
    })

    // @Desc: Fetches an array of existing clients
    CServer.socket.addInstanceMethod("fetchClients", function(self) {
        const result = []
        for (const i in self.instance) {
            if (self.isClient(i)) result.push(i)
        }
        return result
    })
}