
/*----------------------------------------------------------------
     Resource: vNetworify
     Script: utilities: index.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 22/07/2022
     Desc: Utility Handler
----------------------------------------------------------------*/


/*------------------
-- Class: Utility --
------------------*/

const CUtility = {
    print: console.log,
    loadString: eval,
    genUID: require("uuid"),
    queryString: require("querystring")
}
const CTypes = [
    {handler: "isBool", type: "boolean"},
    {handler: "isString", type: "string"},
    {handler: "isNumber", type: "number"},
    {handler: "isObject", type: "object", middleware: function(data, isArray) {return (!isArray && true) || Array.isArray(data)}},
    {handler: "isClass", type: "class"},
    {handler: "isFunction", type: "function"}
]
CTypes.forEach(function(j) {
    CUtility[(j.handler)] = function(data, ...cArgs) {
        var isTypeValid = CUtility.isType(data, j.type)
        if (isTypeValid && j.middleware) {
            isTypeValid = (j.middleware(data, ...cArgs) && isTypeValid) || false
        }
        return isTypeValid
    }
})

CUtility.isNull = function(data) {
    return data == null
}

CUtility.isType = function(data, type) {
    return (!CUtility.isNull(data) && !CUtility.isNull(type) && (typeof(type) == "string") && (typeof(data) == type) && true) || false
}

CUtility.isArray = function(data) {
    return CUtility.isObject(data, true)
}

CUtility.exec = function(exec, ...cArgs) {
    if (!CUtility.isFunction(exec)) return false
    return exec(...cArgs)
}

CUtility.createAPIs = function(buffer, blacklist) {
    if (!CUtility.isObject(buffer)) return false
    blacklist = (CUtility.isObject(blacklist) && blacklist) || false
    var isVoid = true
    const result = {}
    for (const i in buffer) {
        const j = buffer[i]
        if (CUtility.isObject(j)) {
            const __result = CUtility.createAPIs(j)
            if (__result) {
                result[i] = __result
            }
        } else {
            if (CUtility.isFunction(j) && (!blacklist || !blacklist[j])) {
                isVoid = false
                result[i] = j
            }
        }
    }
    return !isVoid && result
}


/*-----------
-- Exports --
-----------*/

module.exports = CUtility