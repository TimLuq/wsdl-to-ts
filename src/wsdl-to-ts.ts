import * as soap from "soap";

export const nsEnums: { [k: string]: boolean } = {};
//nsEnums["https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/SuministroInformacion.xsd#VersionSiiType"] = true;
//nsEnums["https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/SuministroInformacion.xsd#ClaveTipoComunicacionType"] = true;

interface ITwoDown<T> {
    [k: string]: { [k: string]: T };
}

interface IInterfaceObject {
    [key: string]: string | IInterfaceObject;
}

export interface ITypedWsdl {
    client: soap.Client | null,
    files: ITwoDown<string>,
    methods: ITwoDown<{ [k: string]: string }>,
    types: ITwoDown<{ [k: string]: string }>,
}

function wsdlTypeToInterfaceObj(obj: IInterfaceObject): { [k: string]: any } {
    const r: { [k: string]: any } = {};
    for (const k of Object.keys(obj)) {
        if (k === "targetNSAlias" || k === "targetNamespace") {
            continue;
        }
        const v = obj[k];
        const t = typeof v;
        if (t === "string") {
            const [typeName, superTypeClass, typeData] = (v as string).split("|");
            const typeFullName = obj["targetNamespace"] ? obj["targetNamespace"] + "#" + typeName : typeName;
            let typeClass = superTypeClass;
            if (nsEnums[typeFullName] || typeData) {
                const filter = nsEnums[typeFullName] ? () => true : (x: string) => x !== "length" && x !== "pattern" && x !== "maxLength" && x !== "minLength";
                const tdsplit = typeData.split(",").filter(filter);
                if (tdsplit.length) {
                    typeClass = "\"" + tdsplit.join("\" | \"") + "\"";
                }
            }
            r[k] = "/** " + typeFullName + "(" + typeData + ") */ " + typeClass + ";";
        } else {
            r[k] = wsdlTypeToInterfaceObj(obj[k] as IInterfaceObject);
        }
    }
    //console.log("wsdlTypeToInterfaceObj:", r);
    return r;
}

function wsdlTypeToInterfaceString(d: { [k: string]: any }): string {
    const r: string[] = [];
    for (const k of Object.keys(d)) {
        const t = typeof d[k];
        if (t === "string") {
            const v = d[k];
            if (v.startsWith("/**")) {
                const i = v.indexOf("*/") + 2;
                r.push(v.substring(0, i));
                r.push(k + ": " + v.substring(i).trim());
            } else {
                r.push(k + ": " + v);
            }
        } else {
            r.push(k + ": " + wsdlTypeToInterfaceString(d[k]).replace(/\n/g, "\n\t") + ";");
        }
    }
    if (r.length === 0) {
        return "{}";
    }
    return "{\n\t" + r.join("\n\t") + "\n}";
}

function wsdlTypeToInterface(obj: { [k: string]: any }): string {
    return wsdlTypeToInterfaceString(wsdlTypeToInterfaceObj(obj));
}

export function wsdl2ts(wsdlUri: string): Promise<ITypedWsdl> {
    return new Promise<soap.Client>((resolve, reject) => {
        soap.createClient(wsdlUri, {}, (err, client) => {
            if (err) {
                reject(err);
            } else {
                resolve(client);
            }
        });
    }).then((client) => {
        const r: ITypedWsdl = {
            client,
            files: {},
            methods: {},
            types: {},
        };
        const d = client.describe();

        for (const service of Object.keys(d)) {
            for (const port of Object.keys(d[service])) {
                //console.log("-- %s.%s", service, port);
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
                    //console.log("---- %s", method);
                    r.types[service][port]["I" + method + "Input"] =
                        wsdlTypeToInterface(d[service][port][method].input || {});
                    r.types[service][port]["I" + method + "Output"] =
                        wsdlTypeToInterface(d[service][port][method].output || {});
                    r.methods[service][port][method] =
                        "(input: I" + method + "Input, " +
                        "(err: any | null," +
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

function cloneObj<T extends { [k: string]: any }>(a: T): T {
    const b: T = {} as any;
    for (const k of Object.keys(a)) {
        const t = typeof a[k];
        if (t === "object") {
            if (Array.isArray(a[k])) {
                b[k] = a[k].slice();
            } else {
                b[k] = cloneObj(a[k]);
            }
        } else {
            b[k] = a[k];
        }
    }
    return b;
}

export function mergeTypedWsdl(a: ITypedWsdl, ...bs: ITypedWsdl[]): ITypedWsdl {
    const x: ITypedWsdl = {
        client: null,
        files: cloneObj(a.files),
        methods: cloneObj(a.methods),
        types: cloneObj(a.types)
    };
    for (const b of bs) {
        for (const service of Object.keys(b.files)) {
            if (!x.files.hasOwnProperty(service)) {
                x.files[service] = cloneObj(b.files[service]);
                x.methods[service] = cloneObj(b.methods[service]);
                x.types[service] = cloneObj(b.types[service]);
            } else {
                for (const port of Object.keys(b.files[service])) {
                    if (!x.files[service].hasOwnProperty(port)) {
                        x.files[service][port] = b.files[service][port];
                        x.methods[service][port] = cloneObj(b.methods[service][port]);
                        x.types[service][port] = cloneObj(b.types[service][port]);
                    } else {
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

export function outputTypedWsdl(a: ITypedWsdl): Array<{ file: string, data: string[] }> {
    const r: Array<{ file: string, data: string[] }> = [];
    for (const service of Object.keys(a.files)) {
        for (const port of Object.keys(a.files[service])) {
            const d: { file: string, data: string[] } = { file: a.files[service][port], data: [] };
            if (a.types[service] && a.types[service][port]) {
                for (const type of Object.keys(a.types[service][port])) {
                    d.data.push("export interface " + type + " " + a.types[service][port][type]);
                }
            }
            if (a.methods[service] && a.methods[service][port]) {
                const ms: string[] = [];
                for (const method of Object.keys(a.methods[service][port])) {
                    ms.push(method + ": " + a.methods[service][port][method] + ";");
                }
                if (ms.length) {
                    d.data.push("export interface I" + port + "Soap {\n\t" + ms.join("\n\t") + "\n}");
                }
            }
            r.push(d);
        }
    }
    return r;
}
