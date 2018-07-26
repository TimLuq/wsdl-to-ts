import * as soap from "soap";
export declare const nsEnums: {
    [k: string]: boolean;
};
interface ITwoDown<T> {
    [k: string]: {
        [k: string]: T;
    };
}
export interface IInterfaceOptions {
    quoteProperties?: boolean;
}
export interface ITypedWsdl {
    client: soap.Client | null;
    files: ITwoDown<string>;
    methods: ITwoDown<{
        [k: string]: string;
    }>;
    types: ITwoDown<{
        [k: string]: string;
    }>;
    namespaces: ITwoDown<{
        [k: string]: {
            [k: string]: string;
        };
    }>;
}
export declare class TypeCollector {
    readonly ns: string;
    readonly registered: {
        [k: string]: string;
    };
    readonly collected: {
        [k: string]: string;
    };
    constructor(ns: string);
    registerCollected(): this;
}
export declare function wsdl2ts(wsdlUri: string, opts?: IInterfaceOptions): Promise<ITypedWsdl>;
export declare function mergeTypedWsdl(a: ITypedWsdl, ...bs: ITypedWsdl[]): ITypedWsdl;
export declare function outputTypedWsdl(a: ITypedWsdl): Array<{
    file: string;
    data: string[];
}>;
export {};
