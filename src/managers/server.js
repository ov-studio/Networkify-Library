/*----------------------------------------------------------------
     Resource: vNetworkify
     Script: managers: server.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 22/07/2022
     Desc: Server Manager
----------------------------------------------------------------*/


//////////////
// Imports //
//////////////

const CCors = require("cors")
const CHTTP = require("http")
const CExpress = require("express")
const CUtility = require("../utilities")


////////////////////
// Class: Server //
///////////////////

const CServer = CUtility.createClass({
    buffer: {}
})


/////////////////////
// Static Members //
/////////////////////

// @Desc: Creates a fresh server
CServer.public.addMethod("create", function(...cArgs) {
    return CServer.public.createInstance(...cArgs)
})


///////////////////////
// Instance Members //
///////////////////////

// @Desc: Instance constructor
CServer.public.addMethod("constructor", function(self, options) {
    options = (CUtility.isObject(options) && options) || {}
    self.config = {}, self.instance = {}
    self.config.port = (CUtility.isNumber(options.port) && options.port) || false
    if (!CUtility.isServer) {
        self.config.protocol = (CUtility.isString(options.protocol) && options.protocol) || window.location.protocol
        self.config.hostname = (CUtility.isString(options.hostname) && options.hostname) || window.location.hostname
    }
    else {
        self.config.isCaseSensitive = (options.isCaseSensitive && true) || false
        self.config.cors = (CUtility.isObject(options.cors) && options.cors) || false
    }
})

// @Desc: Destroys the instance
CServer.public.addInstanceMethod("destroy", function(self) {
    self.destroyInstance()
    return true
})

// @Desc: Retrieves instance's config
CServer.public.addInstanceMethod("fetchConfig", function(self) {
    return self.config
})

// @Desc: Retrieves instance's server
CServer.public.addInstanceMethod("fetchServer", function(self, index) {
    return (index && self.instance[index]) || false
})

// @Desc: Retrieves connection's status
CServer.public.addInstanceMethod("isConnected", function(self, isSync) {
    if (isSync) return (CUtility.isBool(self.config.isConnected) && self.config.isConnected) || false
    return self.isAwaiting || self.config.isConnected || false
})

// @Desc: Handles Connection Status
const onConnectionStatus = function(self, resolver, state) {
    delete self.isAwaiting
    self.config.isConnected = state
    CUtility.exec(resolver, self.config.isConnected)
    CUtility.print(`━ vNetworkify (${(!CUtility.isServer && "Client") || "Server"}) | ${(state && "Launched") || "Launch failed"} ${(self.config.port && ("[Port: " + self.config.port + "]")) || ""}`)
    return true
}

// @Desc: Handles Connection Status
CServer.public.addInstanceMethod("connect", function(self) {
    if (self.isConnected()) return false
    if (!CUtility.isServer) {
        self.instance.CExpress = {
            post: function(route, data) {
                if (!CUtility.isString(route) || !CUtility.isObject(data)) return false
                return fetch(route, {
                    method: "POST",
                    headers: {["Content-Type"]: "application/json"},
                    body: JSON.stringify(data)
                })
            },
            get: function(route) {
                if (!CUtility.isString(route)) return false
                return fetch(route, {
                    method: "GET"
                })
            },
            put: function(route, data) {
                if (!CUtility.isString(route) || !CUtility.isObject(data)) return false
                return fetch(route, {
                    method: "PUT",
                    headers: {["Content-Type"]: "application/json"},
                    body: JSON.stringify(data)
                })
            },
            delete: function(route) {
                if (!CUtility.isString(route)) return false
                return fetch(route, {
                    method: "DELETE"
                })
            }
        }
        onConnectionStatus(self, null, true)
    }
    else {
        var cResolver = false
        self.isAwaiting = new Promise((resolver) => cResolver = resolver)
        self.instance.CExpress = CExpress()
        self.instance.CHTTP = CHTTP.Server(self.instance.CExpress)
        self.instance.CExpress.use(CCors(self.config.cors))
        self.instance.CExpress.use(CExpress.json())
        self.instance.CExpress.use(CExpress.urlencoded({extended: true}))
        self.instance.CExpress.set("case sensitive routing", self.config.isCaseSensitive)
        // TODO: ADD THIS MIDDLEWARE
        //self.instance.CExpress.all("*", CServer.rest.onMiddleware)
        self.instance.CHTTP.listen(self.config.port, () => onConnectionStatus(self, cResolver, true))
        return true
    }
    return true
})

const test = CServer.public.create({
    port: 33021,
    isCaseSensitive: true
})
test.public.connect()

const test2 = CServer.public.create({
    port: 33022,
    isCaseSensitive: true
})
test2.public.connect()


//////////////
// Exports //
//////////////

module.exports = CServer.public