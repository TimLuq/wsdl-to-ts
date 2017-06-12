"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const soap = require("soap");
exports.nsEnums = {};
function wsdlTypeToInterfaceObj(obj) {
    const r = {};
    for (const k of Object.keys(obj)) {
        if (k === "targetNSAlias" || k === "targetNamespace") {
            continue;
        }
        const isArray = k.endsWith("[]");
        const k2 = isArray ? k.substring(0, k.length - 2) : k;
        const v = obj[k];
        const t = typeof v;
        if (t === "string") {
            const vstr = v;
            const [typeName, superTypeClass, typeData] = vstr.indexOf("|") === -1 ? [vstr, vstr, undefined] : vstr.split("|");
            const typeFullName = obj.targetNamespace ? obj.targetNamespace + "#" + typeName : typeName;
            let typeClass = superTypeClass === "integer" ? "number" : superTypeClass;
            if (exports.nsEnums[typeFullName] || typeData) {
                const filter = exports.nsEnums[typeFullName] ?
                    () => true :
                    (x) => x !== "length" && x !== "pattern" && x !== "maxLength" && x !== "minLength";
                const tdsplit = typeData.split(",").filter(filter);
                if (tdsplit.length) {
                    typeClass = "\"" + tdsplit.join("\" | \"") + "\"";
                }
            }
            if (isArray) {
                typeClass = "Array<" + typeClass + ">";
            }
            r[k2] = "/** " + typeFullName + "(" + typeData + ") */ " + typeClass + ";";
        }
        else {
            const to = wsdlTypeToInterfaceObj(v);
            let tr;
            if (isArray) {
                let s = wsdlTypeToInterfaceString(to).replace(/\n/g, "\n    ");
                if (s.startsWith("/**")) {
                    const i = s.indexOf("*/") + 2;
                    s = s.substring(0, i) + " Array<" + s.substring(i).trim().replace(/;$/, "") + ">;";
                }
                else {
                    s = "Array<" + s.trim().replace(/;$/, "") + ">;";
                }
                tr = s;
            }
            else {
                tr = to;
            }
            r[k2] = tr;
        }
    }
    // console.log("wsdlTypeToInterfaceObj:", r);
    return r;
}
function wsdlTypeToInterfaceString(d) {
    const r = [];
    for (const k of Object.keys(d)) {
        const t = typeof d[k];
        if (t === "string") {
            const v = d[k];
            if (v.startsWith("/**")) {
                const i = v.indexOf("*/") + 2;
                r.push(v.substring(0, i));
                r.push(k + ": " + v.substring(i).trim());
            }
            else {
                r.push(k + ": " + v);
            }
        }
        else {
            r.push(k + ": " + wsdlTypeToInterfaceString(d[k]).replace(/\n/g, "\n    ") + ";");
        }
    }
    if (r.length === 0) {
        return "{}";
    }
    return "{\n    " + r.join("\n    ") + "\n}";
}
function wsdlTypeToInterface(obj) {
    return wsdlTypeToInterfaceString(wsdlTypeToInterfaceObj(obj));
}
function wsdl2ts(wsdlUri) {
    return new Promise((resolve, reject) => {
        soap.createClient(wsdlUri, {}, (err, client) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(client);
            }
        });
    }).then((client) => {
        const r = {
            client,
            files: {},
            methods: {},
            types: {},
        };
        const d = client.describe();
        for (const service of Object.keys(d)) {
            for (const port of Object.keys(d[service])) {
                // console.log("-- %s.%s", service, port);
                if (!r.types[service]) {
                    r.types[service] = {};
                    r.methods[service] = {};
                    r.files[service] = {};
                }
                if (!r.types[service][port]) {
                    r.types[service][port] = {};
                    r.methods[service][port] = {};
                    r.files[service][port] = service + "/" + port;
                }
                for (const method of Object.keys(d[service][port])) {
                    // console.log("---- %s", method);
                    r.types[service][port]["I" + method + "Input"] =
                        wsdlTypeToInterface(d[service][port][method].input || {});
                    r.types[service][port]["I" + method + "Output"] =
                        wsdlTypeToInterface(d[service][port][method].output || {});
                    r.methods[service][port][method] =
                        "(input: I" + method + "Input, " +
                            "cb: (err: any | null," +
                            " result: I" + method + "Output," +
                            " raw: string, " +
                            " soapHeader: {[k: string]: any}) => any" +
                            ") => void";
                }
            }
        }
        return r;
    });
}
exports.wsdl2ts = wsdl2ts;
function cloneObj(a) {
    const b = {};
    for (const k of Object.keys(a)) {
        const t = typeof a[k];
        if (t === "object") {
            if (Array.isArray(a[k])) {
                b[k] = a[k].slice();
            }
            else {
                b[k] = cloneObj(a[k]);
            }
        }
        else {
            b[k] = a[k];
        }
    }
    return b;
}
function mergeTypedWsdl(a, ...bs) {
    const x = {
        client: null,
        files: cloneObj(a.files),
        methods: cloneObj(a.methods),
        types: cloneObj(a.types),
    };
    for (const b of bs) {
        for (const service of Object.keys(b.files)) {
            if (!x.files.hasOwnProperty(service)) {
                x.files[service] = cloneObj(b.files[service]);
                x.methods[service] = cloneObj(b.methods[service]);
                x.types[service] = cloneObj(b.types[service]);
            }
            else {
                for (const port of Object.keys(b.files[service])) {
                    if (!x.files[service].hasOwnProperty(port)) {
                        x.files[service][port] = b.files[service][port];
                        x.methods[service][port] = cloneObj(b.methods[service][port]);
                        x.types[service][port] = cloneObj(b.types[service][port]);
                    }
                    else {
                        x.files[service][port] = b.files[service][port];
                        for (const method of Object.keys(b.methods[service][port])) {
                            x.methods[service][port][method] = b.methods[service][port][method];
                        }
                        for (const type of Object.keys(b.types[service][port])) {
                            x.types[service][port][type] = b.types[service][port][type];
                        }
                    }
                }
            }
        }
    }
    return x;
}
exports.mergeTypedWsdl = mergeTypedWsdl;
function outputTypedWsdl(a) {
    const r = [];
    for (const service of Object.keys(a.files)) {
        for (const port of Object.keys(a.files[service])) {
            const d = { file: a.files[service][port], data: [] };
            if (a.types[service] && a.types[service][port]) {
                for (const type of Object.keys(a.types[service][port])) {
                    d.data.push("export interface " + type + " " + a.types[service][port][type]);
                }
            }
            if (a.methods[service] && a.methods[service][port]) {
                const ms = [];
                for (const method of Object.keys(a.methods[service][port])) {
                    ms.push(method + ": " + a.methods[service][port][method] + ";");
                }
                if (ms.length) {
                    d.data.push("export interface I" + port + "Soap {\n    " + ms.join("\n    ") + "\n}");
                }
            }
            r.push(d);
        }
    }
    return r;
}
exports.outputTypedWsdl = outputTypedWsdl;
//# sourceMappingURL=wsdl-to-ts.js.map