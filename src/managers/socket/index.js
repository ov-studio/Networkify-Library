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
CServer.socket.addMethod("create", function(route, ...cArgs) {
    if (!CServer.isConnected(true) || !CServer.socket.isVoid(route)) return false
    CServer.socket.buffer[route] = new CServer.socket(route, ...cArgs)
    return CServer.socket.buffer[route]
})

// @Desc: Destroys an existing socket by specified route
CServer.socket.addMethod("destroy", function(route) {
    if (CServer.socket.isVoid(route)) return false
    return CServer.socket.buffer[route].destroy()
})


///////////////////////
// Instance Members //
///////////////////////

// @Desc: Handles Socket Message
const onSocketMessage = function(self, client, socket, payload) {
    payload = JSON.parse(CUtility.fromBase64(payload.data))
    if (!socket || !CUtility.isObject(payload)) return false
    if (!CUtility.isString(payload.networkName) || !CUtility.isArray(payload.networkArgs)) {
        if (!CUtility.isServer) {
            if (payload.client) {
                CUtility.fetchVID(socket, payload.client)
                CUtility.exec(self.onClientConnect, payload.client)
            }
            else if (payload["@disconnect-reason"]) self["@disconnect-reason"] = payload["@disconnect-reason"]
            else if (payload.room) {
                if (payload.action == "join") {
                    self.room[(payload.room)] = self.room[(payload.room)] || {}
                    self.room[(payload.room)].member = self.room[(payload.room)].member || {}
                    self.room[(payload.room)].member[client] = true
                    CUtility.exec(self.onClientJoinRoom, payload.room, client)
                }
                else if (payload.action == "leave") {
                    delete self.room[(payload.room)]
                    CUtility.exec(self.onClientLeaveRoom, payload.room, client)
                }
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
            socket.send(CUtility.toBase64(JSON.stringify(payload)))
        }
        else CServer.socket.resolveCallback(self, client, payload)
        return true
    }
    self.emit(payload.networkName, null, ...payload.networkArgs)
    return true
}

// @Desc: Verifies instance's validity
CServer.socket.addInstanceMethod("isInstance", function(self) {
    return (!self.isUnloaded && !CServer.socket.isVoid(self.route) && true) || false
})

// @Desc: Destroys the instance
CServer.socket.addInstanceMethod("destroy", function(self) {
    self["@disconnect-reason"] = `${(CUtility.isServer && "server") || "client"}-disconnected`
    for (const i in self.network) {
        const j = self.network[i]
        j.destroy()
    }
    if (CUtility.isServer) {
        for (const i in self.room) {
            self.destroyRoom(i)
        }
        for (const i in self.instance) {
            const j = self.instance[i]
            for (const k in j.queue) {
                const v = j[k]
                v.reject()
            }
            j.socket.send(CUtility.toBase64(JSON.stringify({["@disconnect-reason"]: self["@disconnect-reason"]})))
            j.socket.close()
        }
    }
    self.isUnloaded = true
    self.server.close()
    delete CServer.socket.buffer[(this.route)]
    return true
})

if (!CUtility.isServer) {
    ///////////////////////
    // Instance Members //
    ///////////////////////

    // @Desc: Instance Constructor
    CServer.socket.addMethod("constructor", function(self, route, options) {
        CUtility.fetchVID(self)
        self.config = {
            isConnected: false,
            options: {}
        }
        if (CUtility.isObject(options)) {
            if (CUtility.isObject(options.reconnection) && CUtility.isNumber(options.reconnection.attempts) && CUtility.isNumber(options.reconnection.interval)) {
                self.config.options.reconnection = {
                    attempts: Math.max(1, options.reconnection.attempts),
                    interval: Math.max(1, options.reconnection.interval)
                }
            }
        }
        self.route = route
        self.queue = {}, self.network = {}, self.room = {}
        var cResolver = false
        var connect = false, reconnect = false
        connect = function(isReconnection) {
            if (!isReconnection && self.isConnected()) return false
            self.config.isAwaiting = self.config.isAwaiting || new Promise((resolver) => cResolver = resolver)
            self.server = new WebSocket(`${((CServer.config.protocol == "https") && "wss") || "ws"}://${CServer.config.hostname}:${CServer.config.port}/${self.route}`)
            self.server.onopen = function() {
                self.config.isAwaiting = null
                self.config.isConnected = true
                cResolver(self.config.isConnected)
                return true
            }
            self.server.onclose = function() {
                var isToBeReconnected = true
                isToBeReconnected = (isToBeReconnected && reconnect()) || false
                if (!isToBeReconnected) {
                    self.destroy()
                    self.config.isConnected = false
                    cResolver(self.config.isConnected)
                    CUtility.exec(self.onClientDisconnect, CUtility.fetchVID(self.server, null, true) || false, (self.config.isConnected && (self["@disconnect-reason"] || "client-disconnected")) || "server-nonexistent")
                }
                return true
            }
            self.server.onerror = function(error) {
                self.config.isConnected = false
                cResolver(self.config.isConnected)
                CUtility.exec(self.onConnectionError, error)
                return true
            }
            self.server.onmessage = function(payload) {
                return onSocketMessage(self, CUtility.fetchVID(self.server, null, true), self.server, payload)
            }
        }
        reconnect = function() {
            console.log("attempting to reconnect...")
            self.reconnectTimer = setTimeout(function() {
                console.log("Reconnecting")
                self.connect(true)
            }, self.config.options.reconnection.interval)
            return true
        }
        self.connect = function() {
            return connect()
        }
    })

    // @Desc: Retrieves connection's status of instance
    CServer.socket.addInstanceMethod("isConnected", function(self, isSync) {
        if (isSync) return (CUtility.isBool(self.config.isConnected) && self.config.isConnected) || false
        return self.config.isAwaiting || self.config.isConnected || false
    })
}
else {
    ///////////////////////
    // Instance Members //
    ///////////////////////

    // @Desc: Instance Constructor
    CServer.socket.addMethod("constructor", function(self, route) {
        CUtility.fetchVID(self)
        self.route = route, self.network = {}
        self.instance = {}, self.room = {}
        self.server = new CWS.Server({
            noServer: true,
            path: `/${self.route}`
        })
        self.server.onerror = function(error) {
            CUtility.exec(self.onConnectionError, error)
            return true
        }
        CServer.instance.CHTTP.on("upgrade", function(request, socket, head) {
            self.server.handleUpgrade(request, socket, head, function(socket) {
                var [instance, query] = request.url.split("?")
                instance = CServer.socket.fetch(instance.slice(1))
                if (!instance) return false
                const clientInstance = CServer.socket.client.create(socket)
                const client = CUtility.fetchVID(clientInstance, null, true)
                self.instance[client] = clientInstance
                clientInstance.queue = {}, clientInstance.room = {}
                query = CUtility.queryString.parse(query)
                clientInstance.socket.send(CUtility.toBase64(JSON.stringify({client: client})))
                CUtility.exec(self.onClientConnect, client)
                clientInstance.socket.onclose = function() {
                    for (const i in clientInstance.socket.room) {
                        self.leaveRoom(i, client)
                    }
                    clientInstance.destroy()
                    delete self.instance[client]
                    CUtility.exec(self.onClientDisconnect, client, self["@disconnect-reason"] || "client-disconnected")
                    return true
                }
                clientInstance.socket.onmessage = function(payload) {
                    return onSocketMessage(self, client, clientInstance.socket, payload)
                }
            })
        })
    }, "isInstance")

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