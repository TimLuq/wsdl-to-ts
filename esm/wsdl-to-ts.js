import * as soap from "soap";
import * as _ from "lodash";
import Templates from "./template";
import * as path from "path";
// import { diffLines } from "diff";
export const nsEnums = {};
export class TypeCollector {
    constructor(ns) {
        this.ns = ns;
        this.soapNamespaces = [];
        this.registered = {};
        this.collected = {};
    }
    registerCollected() {
        for (const k of Object.keys(this.collected)) {
            if (this.collected[k]) {
                this.registered[k] = this.collected[k];
            }
            else {
                delete this.registered[k];
            }
            delete this.collected[k];
        }
        return this;
    }
}
function wsdlTypeToInterfaceObj(obj, parentName, typeCollector) {
    const output = {
        keys: {},
        namespace: obj.targetNSAlias === "tns" ? "" : obj.targetNamespace,
    };
    for (const key of Object.keys(obj)) {
        if (key === "targetNSAlias" || key === "targetNamespace") {
            continue;
        }
        const isArray = key.endsWith("[]");
        const propertyName = isArray ? key.substring(0, key.length - 2) : key;
        const collectedTypeName = parentName
            ? `${parentName}_${propertyName}`
            : propertyName;
        const v = obj[key];
        const t = typeof v;
        if (t === "string") {
            const vstr = v;
            const [typeName, superTypeClass, typeData] = vstr.indexOf("|") === -1 ? [vstr, vstr, undefined] : vstr.split("|");
            if (obj.targetNamespace &&
                typeCollector &&
                typeof obj.targetNamespace === "string" &&
                typeCollector.soapNamespaces.indexOf(obj.targetNamespace) <
                    0 &&
                typeof obj.targetNSAlias === "string" &&
                typeCollector.soapNamespaces.indexOf(obj.targetNSAlias) < 0 &&
                obj.targetNSAlias !== "tns") {
                typeCollector.soapNamespaces.push(obj.targetNamespace);
            }
            const typeFullName = obj.targetNamespace
                ? obj.targetNamespace + "#" + typeName
                : typeName;
            let typeClass = superTypeClass === "integer" ? "number" : superTypeClass;
            if (nsEnums[typeFullName] || typeData) {
                const filter = nsEnums[typeFullName]
                    ? () => true
                    : (x) => x !== "length" &&
                        x !== "pattern" &&
                        x !== "maxLength" &&
                        x !== "minLength" &&
                        x !== "minInclusive" &&
                        x !== "maxInclusive" &&
                        x !== "maxInclusive" &&
                        x !== "maxExclusive" &&
                        x !== "fractionDigits" &&
                        x !== "totalDigits" &&
                        x !== "whiteSpace";
                const tdsplit = typeData.split(",").filter(filter);
                if (tdsplit.length) {
                    typeClass = '"' + tdsplit.join('" | "') + '"';
                }
            }
            if (isArray) {
                if (/^[A-Za-z0-9.]+$/.test(typeClass)) {
                    typeClass += "[]";
                }
                else {
                    typeClass = "Array<" + typeClass + ">";
                }
            }
            output.keys[propertyName] =
                "/** " + typeFullName + "(" + typeData + ") */ " + typeClass + ";";
        }
        else {
            const to = wsdlTypeToInterfaceObj(v, `${parentName}_${propertyName}`, typeCollector);
            let tr;
            if (isArray) {
                let s = wsdlTypeToInterfaceString(to.keys);
                if (typeCollector && typeCollector.ns) {
                    if (typeCollector.registered.hasOwnProperty(collectedTypeName) &&
                        typeCollector.registered[collectedTypeName] &&
                        typeCollector.registered[collectedTypeName].object === s) {
                        s = typeCollector.ns + ".I" + collectedTypeName + ";";
                    }
                    else if (typeCollector.collected.hasOwnProperty(collectedTypeName) &&
                        typeCollector.collected[collectedTypeName]) {
                        if (typeCollector.collected[collectedTypeName].object !== s) {
                            typeCollector.collected[collectedTypeName] = null;
                        }
                    }
                    else {
                        typeCollector.collected[collectedTypeName] = {
                            object: s,
                            namespace: to.namespace,
                        };
                    }
                }
                s = s.replace(/\n/g, "\n    ");
                if (s.startsWith("/**")) {
                    const i = s.indexOf("*/") + 2;
                    s =
                        s.substring(0, i) +
                            " Array<" +
                            s
                                .substring(i)
                                .trim()
                                .replace(/;$/, "") +
                            ">;";
                }
                else {
                    s = s.trim().replace(/;$/, "");
                    if (/^[A-Za-z0-9.]+$/.test(s)) {
                        s += "[];";
                    }
                    else {
                        s = "Array<" + s + ">;";
                    }
                }
                tr = s;
            }
            else {
                tr = to.keys;
                if (typeCollector && typeCollector.ns) {
                    const ss = wsdlTypeToInterfaceString(to.keys);
                    if (typeCollector.registered.hasOwnProperty(collectedTypeName) &&
                        typeCollector.registered[collectedTypeName] &&
                        typeCollector.registered[collectedTypeName].object === ss) {
                        tr = typeCollector.ns + ".I" + collectedTypeName + ";";
                    }
                    else if (typeCollector.collected.hasOwnProperty(collectedTypeName) &&
                        typeCollector.collected[collectedTypeName]) {
                        if (typeCollector.collected[collectedTypeName].object !== ss) {
                            typeCollector.collected[collectedTypeName] = null;
                        }
                    }
                    else {
                        typeCollector.collected[collectedTypeName] = {
                            object: ss,
                            namespace: to.namespace,
                        };
                    }
                }
                else {
                    console.log(typeCollector);
                }
            }
            output.keys[propertyName] = tr;
        }
    }
    // console.log("wsdlTypeToInterfaceObj:", r);
    return output;
}
const knownTypes = [];
function wsdlTypeToInterfaceString(d, opts = {}) {
    const r = [];
    let orderCounter = 0;
    for (const k of Object.keys(d)) {
        const t = typeof d[k];
        let propertyName = k;
        if (opts.quoteProperties ||
            (opts.quoteProperties === undefined &&
                !/^[A-Za-z][A-Za-z0-9_-]*$/.test(k))) {
            propertyName = JSON.stringify(k);
        }
        let type = "";
        if (t === "string") {
            const v = d[k];
            type = v;
            if (v.startsWith("/**")) {
                const i = v.indexOf("*/") + 2;
                r.push(v.substring(0, i));
                /*
                        let fullType = v.substring(4, v.indexOf('#')-3);
                        fullType = fullType.replace(/:/g, '');
                        if (p.indexOf("\"") === 0) {
                          p = `"${fullType}:${p.substring(1)}`;
                        } else {
                          p = JSON.stringify(`${fullType}:${p}`);
                        }
                        */
                // for types like "xsd:string" only the "string" part is used
                const rawtype = v.substring(i).trim();
                const colon = rawtype.indexOf(":");
                if (colon !== -1) {
                    type = rawtype.substring(colon + 1);
                }
                else {
                    type = rawtype;
                }
                if (type.endsWith(">;")) {
                    type = type.substring(0, type.length - 2) + ";";
                }
                knownTypes.push(type);
            }
            // r.push(propertyName + ": " + type);
        }
        else {
            type =
                wsdlTypeToInterfaceString(d[k], opts).replace(/\n/g, "\n    ") + ";";
        }
        let shortenedType = type;
        if (shortenedType.endsWith(";")) {
            shortenedType = shortenedType.substring(0, shortenedType.length - 1);
        }
        if (shortenedType.startsWith("Array<") && shortenedType.endsWith(">")) {
            shortenedType = shortenedType
                .substring(6)
                .substring(0, shortenedType.length - 7);
        }
        if (shortenedType.includes(".") && !shortenedType.startsWith("{")) {
            r.push(`@Type(() => ${shortenedType})`);
        }
        r.push(`@XmlOrder(${orderCounter++})`);
        r.push(propertyName + ": " + type);
    }
    if (r.length === 0) {
        return "{}";
    }
    return "{\n    " + r.join("\n    ") + "\n}";
}
function wsdlTypeToInterface(obj, parentName, typeCollector, opts) {
    const interfaceObj = wsdlTypeToInterfaceObj(obj, parentName, typeCollector);
    return wsdlTypeToInterfaceString(interfaceObj.keys, opts);
}
export function wsdl2ts(wsdlUri, opts) {
    return new Promise((resolve, reject) => {
        soap.createClient(wsdlUri, {}, (err, client) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(client);
            }
        });
    }).then(client => {
        const output = {
            client,
            files: {},
            methods: {},
            namespaces: {},
            types: {},
            soapNamespaces: [],
            endpoint: "",
        };
        const description = client.describe();
        const describedServices = client.wsdl.services;
        const describedService = describedServices[Object.keys(describedServices)[0]];
        const describecPorts = describedService.ports;
        const describedPort = describecPorts[Object.keys(describecPorts)[0]];
        output.endpoint = describedPort.location;
        for (const service of Object.keys(description)) {
            for (const port of Object.keys(description[service])) {
                const collector = new TypeCollector(port + "Types");
                // console.log("-- %s.%s", service, port);
                if (!output.types[service]) {
                    output.types[service] = {};
                    output.methods[service] = {};
                    output.files[service] = {};
                    output.namespaces[service] = {};
                }
                if (!output.types[service][port]) {
                    output.types[service][port] = {};
                    output.methods[service][port] = {};
                    output.files[service][port] = service + "/" + port;
                    output.namespaces[service][port] = {};
                }
                for (let maxi = 0; maxi < 32; maxi++) {
                    for (const method of Object.keys(description[service][port])) {
                        // console.log("---- %s", method);
                        wsdlTypeToInterface(description[service][port][method].input || {}, method + "Input", collector, opts);
                        wsdlTypeToInterface(description[service][port][method].output || {}, method + "Output", collector, opts);
                    }
                    const reg = cloneObj(collector.registered);
                    collector.registerCollected();
                    const regKeys0 = Object.keys(collector.registered);
                    const regKeys1 = Object.keys(reg);
                    if (regKeys0.length === regKeys1.length) {
                        let noChange = true;
                        for (const rk of regKeys0) {
                            if (JSON.stringify(collector.registered[rk]) !==
                                JSON.stringify(reg[rk])) {
                                noChange = false;
                                break;
                            }
                        }
                        if (noChange) {
                            break;
                        }
                    }
                    if (maxi === 31) {
                        console.warn("wsdl-to-ts: Aborted nested interface changes");
                    }
                }
                output.soapNamespaces = collector.soapNamespaces;
                const collectedKeys = Object.keys(collector.registered);
                if (collectedKeys.length) {
                    const ns = (output.namespaces[service][port][collector.ns] = {});
                    for (const k of collectedKeys) {
                        const obj = collector.registered[k];
                        let fullstring = "";
                        if (obj.namespace) {
                            fullstring += `@XmlNamespace("${obj.namespace}")\n`;
                        }
                        fullstring +=
                            "export class I" + k + " extends ArBaseSoapNode " + obj.object;
                        ns[k] = fullstring;
                    }
                }
                for (const method of Object.keys(description[service][port])) {
                    output.types[service][port]["I" + method + "Input"] = wsdlTypeToInterface(description[service][port][method].input || {}, method + "Input", collector, opts);
                    output.types[service][port]["I" + method + "Output"] = wsdlTypeToInterface(description[service][port][method].output || {}, method + "Output", collector, opts);
                    /*
                    output.methods[service][port][method] =
                      "(input: I" +
                      method +
                      "Input, " +
                      "cb: (err: any | null," +
                      " result: I" +
                      method +
                      "Output," +
                      " raw: string, " +
                      " soapHeader: {[k: string]: any; }) => any, " +
                      "options?: any, " +
                      "extraHeaders?: any" +
                      ") => void";
                      */
                    output.methods[service][port][method + "Async"] =
                        "(input: I" +
                            method +
                            "Input, options?: any, extraHeaders?: any) => Promise<{result: I" +
                            method +
                            "Output, rawResponse: string, soapHeader: {[k: string]: any; }, rawRequest: string}>";
                }
            }
        }
        return output;
    });
}
function cloneObj(a) {
    const b = {};
    for (const k of Object.keys(a)) {
        const t = typeof a[k];
        b[k] =
            t === "object"
                ? Array.isArray(a[k])
                    ? a[k].slice()
                    : cloneObj(a[k])
                : a[k];
    }
    return b;
}
export function mergeTypedWsdl(a, ...bs) {
    const x = {
        client: a.client,
        files: cloneObj(a.files),
        methods: cloneObj(a.methods),
        namespaces: cloneObj(a.namespaces),
        types: cloneObj(a.types),
        soapNamespaces: a.soapNamespaces,
        endpoint: a.endpoint,
    };
    for (const b of bs) {
        for (const service of Object.keys(b.files)) {
            if (!x.files.hasOwnProperty(service)) {
                x.files[service] = cloneObj(b.files[service]);
                x.methods[service] = cloneObj(b.methods[service]);
                x.types[service] = cloneObj(b.types[service]);
                x.namespaces[service] = cloneObj(b.namespaces[service]);
            }
            else {
                for (const port of Object.keys(b.files[service])) {
                    if (!x.files[service].hasOwnProperty(port)) {
                        x.files[service][port] = b.files[service][port];
                        x.methods[service][port] = cloneObj(b.methods[service][port]);
                        x.types[service][port] = cloneObj(b.types[service][port]);
                        x.namespaces[service][port] = cloneObj(b.namespaces[service][port]);
                    }
                    else {
                        x.files[service][port] = b.files[service][port];
                        for (const method of Object.keys(b.methods[service][port])) {
                            x.methods[service][port][method] =
                                b.methods[service][port][method];
                        }
                        for (const type of Object.keys(b.types[service][port])) {
                            x.types[service][port][type] = b.types[service][port][type];
                        }
                        for (const ns of Object.keys(b.namespaces[service][port])) {
                            if (!x.namespaces[service][port].hasOwnProperty(ns)) {
                                x.namespaces[service][port][ns] = cloneObj(b.namespaces[service][port][ns]);
                            }
                            else {
                                for (const nsi of Object.keys(b.namespaces[service][port][ns])) {
                                    x.namespaces[service][port][ns][nsi] =
                                        b.namespaces[service][port][ns][nsi];
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return x;
}
export function outputTypedWsdl(a) {
    const r = [];
    for (const service of Object.keys(a.files)) {
        for (const port of Object.keys(a.files[service])) {
            const fileName = a.files[service][port].replace("Soap", "");
            const interfaceFile = {
                file: fileName + "Types",
                data: [],
            };
            const serviceFile = {
                file: fileName,
                data: [],
            };
            const relativeTypesPath = path
                .relative(fileName, fileName + "Types")
                .substring(1);
            const absoluteWsdl = path.resolve(a.client.wsdl.uri);
            const absoluteServiceFile = path.resolve(fileName);
            const relativeWsdl = path.relative(absoluteServiceFile, absoluteWsdl);
            const types = _.uniq(knownTypes)
                .map(u => u.replace(";", ""))
                // .map(u => (u.endsWith(">") ? u.substring(0, u.length - 1) : u))
                .filter(e => e !== "string" &&
                e !== "number" &&
                e !== "boolean" &&
                !e.includes('"'));
            types.push("ArBaseSoapNode");
            interfaceFile.data.push(`import { ${types.join(", ")} } from "../../wsdl.types";`);
            interfaceFile.data.push(`import { XmlNamespace, XmlOrder } from "../../wsdl.decorators";`);
            interfaceFile.data.push(`import { Type } from "class-transformer";`);
            interfaceFile.data.push(`export const ${interfaceFile.file.substring(interfaceFile.file.lastIndexOf("/") + 1)}Namespaces: string[] = ${JSON.stringify(a.soapNamespaces, null, 4)};`);
            if (a.namespaces[service] && a.namespaces[service][port]) {
                for (const ns of Object.keys(a.namespaces[service][port])) {
                    const ms = [];
                    for (const nsi of Object.keys(a.namespaces[service][port][ns])) {
                        ms.push(a.namespaces[service][port][ns][nsi].replace(/\n/g, "\n    "));
                    }
                    if (ms.length) {
                        interfaceFile.data.push("export namespace " + ns + " {\n    " + ms.join("\n    ") + "\n}");
                    }
                }
            }
            if (a.types[service] && a.types[service][port]) {
                for (const type of Object.keys(a.types[service][port])) {
                    interfaceFile.data.push("export class " +
                        type +
                        " extends ArBaseSoapNode " +
                        a.types[service][port][type]);
                }
            }
            if (a.methods[service] && a.methods[service][port]) {
                const ms = [];
                serviceFile.data.push(Templates.serviceHeaderTemplate({
                    relativeTypesPath,
                    serviceName: service,
                    defaultEndpoint: a.endpoint,
                    wsdlLocation: relativeWsdl,
                }));
                for (const method of Object.keys(a.methods[service][port])) {
                    const templateObj = {
                        methodName: method.replace("Async", ""),
                        serviceName: service,
                        relativeTypesPath,
                    };
                    ms.push(method + ": " + a.methods[service][port][method] + ";");
                    serviceFile.data.unshift(Templates.serviceImportTemplate(templateObj));
                    serviceFile.data.push(Templates.serviceMethodTemplate(templateObj));
                }
                serviceFile.data.push("}");
                if (ms.length) {
                    interfaceFile.data.push("export interface I" +
                        port +
                        "Soap {\n    " +
                        ms.join("\n    ") +
                        "\n}");
                }
            }
            r.push(interfaceFile);
            r.push(serviceFile);
        }
    }
    return r;
}
//# sourceMappingURL=wsdl-to-ts.js.map