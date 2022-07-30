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

const CServer = {
    config: {},
    instance: {}
}

// @Desc: Handles Connection Status
const onConnectionStatus = function(resolver, state) {
    CServer.config.isAwaiting = null
    CServer.config.isConnected = state
    if (CUtility.isFunction(resolver)) resolver(CServer.config.isConnected)
    CUtility.print(`━ vNetworkify (${(!CUtility.isServer && "Client") || "Server"}) | ${(state && "Launched") || "Launch failed"} [Port: ${CServer.config.port}]`)
    return true
}

// @Desc: Retrieves connection's confign
CServer.fetchConfig = function() {
    return CServer.config
}

// @Desc: Retrieves specified server
CServer.fetchServer = function(index) {
    return (index && CServer.instance[index]) || false
}

// @Desc: Retrieves connection's status
CServer.isConnected = function(isSync) {
    if (isSync) return (CUtility.isBool(CServer.config.isConnected) && CServer.config.isConnected) || false
    return CServer.config.isAwaiting || CServer.config.isConnected || false
}

if (!CUtility.isServer) {
    // @Desc: Intializes & sets up server connections
    CServer.connect = function(port, options) {
        port = (CUtility.isNumber(port) && port) || false
        options = (CUtility.isObject(options) && options) || {}
        if (!port || CServer.isConnected()) return false
        CServer.config.port = port
        CServer.config.protocol = (CUtility.isString(options.protocol) && options.protocol) || window.location.protocol
        CServer.config.hostname = (CUtility.isString(options.hostname) && options.hostname) || window.location.hostname
        CServer.instance.CExpress = {
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
        onConnectionStatus(null, true)
        return true
    } 
}
else {
    // @Desc: Intializes & sets up server connections
    CServer.connect = function(port, options) {
        port = (CUtility.isNumber(port) && port) || false
        options = (CUtility.isObject(options) && options) || {}
        if (!port || CServer.isConnected()) return false
        var cResolver = false
        CServer.config.isAwaiting = new Promise((resolver) => cResolver = resolver)
        CServer.config.port = port
        CServer.config.isCaseSensitive = (options.isCaseSensitive && true) || false
        CServer.config.cors = (CUtility.isObject(options.cors) && options.cors) || false
        CServer.instance.CExpress = CExpress()
        CServer.instance.CHTTP = CHTTP.Server(CServer.instance.CExpress)
        CServer.instance.CExpress.use(CCors(CServer.config.cors))
        CServer.instance.CExpress.use(CExpress.json())
        CServer.instance.CExpress.use(CExpress.urlencoded({extended: true}))
        CServer.instance.CExpress.set("case sensitive routing", CServer.config.isCaseSensitive)
        CServer.instance.CExpress.all("*", CServer.rest.onMiddleware)
        CServer.instance.CHTTP.listen(CServer.config.port, () => onConnectionStatus(cResolver, true))
        return true
    }    
}


//////////////
// Exports //
//////////////

module.exports = CServer