/*----------------------------------------------------------------
     Resource: vNetworkify
     Script: utilities: type.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 22/07/2022
     Desc: Type Utilities
----------------------------------------------------------------*/


//////////////
// Imports //
//////////////

const CUtility = require("./")


//////////////////
// Class: Type //
//////////////////

const CType = [
    {handler: "isBool", type: "boolean"},
    {handler: "isString", type: "string"},
    {handler: "isNumber", type: "number"},
    {handler: "isObject", type: "object", middleware: ((data, isArray) => (!isArray && true) || Array.isArray(data))},
    {handler: "isFunction", type: "function"}
]
CType.forEach((j) => {
    CUtility[(j.handler)] = (data, ...cArgs) => {
        var isTypeValid = CUtility.isType(data, j.type)
        if (isTypeValid && j.middleware) isTypeValid = (j.middleware(data, ...cArgs) && isTypeValid) || false
        return isTypeValid
    }
})

// @Desc: Verifies whether specified data is null
CUtility.isNull = (data) => {
    return data == null
}

// @Desc: Verifies specified data's type
CUtility.isType = (data, type) => (!CUtility.isNull(data) && !CUtility.isNull(type) && (typeof(type) == "string") && (typeof(data) == type) && true) || false

// @Desc: Verifies whether specified data is an array
CUtility.isArray = (data) => CUtility.isObject(data, true)

// @Desc: Verifies whether specified data is a class
CUtility.isClass = (data) => (CUtility.isFunction(data, "function") && data.isClass && true) || false

CUtility.cloneObject = (parent, isRecursive) => {
    if (!CUtility.isObject(parent)) return false
    const result = {}
    for (const i in parent) {
        const j = parent[i]
        if (isRecursive && CUtility.isObject(j)) result[i] = CUtility.cloneObject(j, isRecursive)
        else result[i] = j
    }
    return result
}

// @Desc: Creates a new dynamic class
CUtility.createClass = (parent) => {
    const __I = new WeakMap()
    class __C {
        static isClass = true
        constructor(...cArgs) {
            __I.set(this, {})
            CUtility.exec(__C.constructor, this, ...cArgs)
        }
    }
    if (CUtility.isObject(parent)) {
        for (const i in parent) {
            __C[i] = parent[i]
        }
    }
    __C.addMethod = (index, exec, isInstanceware) => {
        if (!CUtility.isString(index) || !CUtility.isFunction(exec)) return false
        if ((index == "constructor") && CUtility.isString(isInstanceware)) __C.isInstanceware = isInstanceware
        __C[index] = exec
        return true
    }
    __C.removeMethod = (index) => {
        if (!CUtility.isString(index) || !CUtility.isFunction(__C[index])) return false
        delete __C[index]
        return true
    }
    __C.addInstanceMethod = (index, exec) => {
        if (!CUtility.isString(index) || !CUtility.isFunction(exec)) return false
        __C.prototype[index] = function(...cArgs) {
            const self = this
            const isInstanceware = __C.isInstanceware
            if (!__I.has(self) || (CUtility.isString(isInstanceware) && (index != isInstanceware) && CUtility.isFunction(self[isInstanceware]) && !self[isInstanceware]())) return false
            return exec(self, ...cArgs)
        }
        return true
    }
    __C.removeInstanceMethod = (index) => {
        if (!CUtility.isString(index) || !CUtility.isFunction(__C.prototype[index])) return false
        delete __C.prototype[index]
        return true
    }
    __C.createInstance = (...cArgs) => new __C(...cArgs)
    __C.addInstanceMethod("isInstance", (self) => __I.has(self))
    __C.addInstanceMethod("destroyInstance", (self) => __I.delete(self))
    return {public: __C, private: {}, instance: __I}
}