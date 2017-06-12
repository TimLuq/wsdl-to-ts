#!/usr/bin/env node

import { wsdl2ts, mergeTypedWsdl, outputTypedWsdl, ITypedWsdl } from "./wsdl-to-ts";
import * as mkdirp from "mkdirp";
import { writeFile, rename } from "fs";
import * as minimist from "minimist";

interface ConfigObject {
    outdir: string;
    files: string[];
}

const config: ConfigObject = { outdir: "./wsdl", files: [] };

const args = minimist(process.argv.slice(2));

if (args.help) {

}

if (args.version) {
    const pack = require("../package.json");
    console.log("%s %s", "wsdl-to-ts", pack.version);
    process.exit(0);
    throw new Error("Exited");
}

if (args._) {
    config.files.push.apply(config.files, args._);
}

if (config.files.length === 0) {
    console.error("No files given");
    process.exit(1);
    throw new Error("No files");
}

function mkdirpp(dir: string, mode?: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        mkdirp(dir, mode || 0o755, (err, made) => {
            if (err) {
                reject(err);
            } else {
                resolve(made);
            }
        });
    });
}

Promise.all(config.files.map(wsdl2ts)).
    then((xs) => mergeTypedWsdl.apply(undefined, xs)).
    then(outputTypedWsdl).
    then((xs: Array<{ file: string, data: string[] }>) => {
        return Promise.all(xs.map((x) => {
            console.log("-- %s --", x.file);
            console.log("%s", x.data.join("\n\n"));
            const file = config.outdir + "/" + x.file;
            const dir = file.replace(/\/[^\/]+$/, "");
            return mkdirpp(dir).then(() => {
                return new Promise((resolve, reject) => {
                    const tsfile = file + ".ts.tmp";
                    writeFile(tsfile, x.data.join("\n\n"), (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(tsfile);
                        }
                    });
                });
            });
        }));
    }).
    then((files: string[]) => Promise.all(files.map((file) => {
        return new Promise((resolve, reject) => {
            const realFile = file.replace(/\.[^\.]+$/, "");
            rename(file, realFile, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(realFile);
                }
            });
        });
    }))).
    catch((err) => {
        console.error(err);
        process.exitCode = 3;
    });
