#!/usr/bin/env node
'use strict';
import { rename, writeFile } from 'fs';
import * as minimist from 'minimist';
import * as mkdirp from 'mkdirp';
import { mergeTypedWsdl, outputTypedWsdl, wsdl2ts, } from './wsdl-to-ts';
import * as request from 'request';
import * as prettier from 'prettier';
import { EOL } from 'os';
const opts = {};
const config = {
    outdir: './wsdl',
    files: [],
    tslintDisable: ['max-line-length', 'no-empty-interface'],
    tslintEnable: [],
};
const wsdl_options = {}; // the soap.IOptions in the create client request
let wsdl_headers = {};
let args = minimist(process.argv.slice(2));
if (args.help) {
    // TODO
}
if (args.version) {
    /* tslint:disable:no-var-requires */
    const pack = require('../package.json');
    console.log('%s %s', 'wsdl-to-ts', pack.version);
    process.exit(0);
    throw new Error('Exited');
}
if (args.hasOwnProperty('tslint')) {
    if (args.tslint === 'true') {
        config.tslintEnable = null;
    }
    else if (args.tslint === 'false' || args.tslint === 'disable') {
        config.tslintDisable = null;
    }
    else {
        config.tslintEnable = args.tslint ? args.tslint.split(',') : null;
    }
}
if (args.hasOwnProperty('tslint-disable')) {
    config.tslintDisable = args['tslint-disable']
        ? args['tslint-disable'].split(',')
        : null;
}
if (args.outdir || args.outDir) {
    config.outdir = args.outdir || args.outDir;
}
if (args.hasOwnProperty('quote')) {
    if (args.quote === 'false' ||
        args.quote === 'disable' ||
        args.quote === '0') {
        opts.quoteProperties = false;
    }
    else if (args.quote === 'true' || args.quote === '1' || !args.quote) {
        opts.quoteProperties = true;
    }
}
if (args.hasOwnProperty('user') && args.hasOwnProperty('password')) {
    var auth = 'Basic ' + Buffer.from(args.user + ':' + args.password).toString('base64');
    wsdl_headers = {
        wsdl_headers: {
            Authorization: auth,
        },
    };
    Object.assign(wsdl_options, wsdl_headers);
}
if (args.hasOwnProperty('verifySSL')) {
    var request_options = {};
    if (args.verifySSL === true) {
        request_options = {
            request: request.defaults({
                strictSSL: true,
            }),
        };
    }
    else {
        request_options = {
            request: request.defaults({
                strictSSL: false,
            }),
        };
    }
    Object.assign(wsdl_options, request_options);
}
if (args._ && args._.length > 0) {
    config.files.push.apply(config.files, args._);
}
else if (args.hasOwnProperty('url')) {
    config.files.push(args.url);
}
if (config.files.length === 0) {
    console.error('No files given');
    process.exit(1);
    throw new Error('No files');
}
function mkdirpp(dir, mode) {
    return new Promise((resolve, reject) => {
        mkdirp(dir, mode || 0o755, (err, made) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(made);
            }
        });
    });
}
Promise.all(config.files.map(uri => wsdl2ts(uri, wsdl_options, opts)))
    .then(xs => mergeTypedWsdl.apply(undefined, xs))
    .then(outputTypedWsdl)
    .then((xs) => {
    return Promise.all(xs.map(x => {
        console.log('-- %s --', x.file);
        console.log('%s', x.data.join('\n\n'));
        const file = config.outdir + '/' + x.file;
        const dir = file.replace(/\/[^/]+$/, '');
        return mkdirpp(dir).then(() => {
            return new Promise((resolve, reject) => {
                const tsfile = file + '.ts.tmp';
                const fileData = [];
                if (config.tslintEnable === null) {
                    fileData.push('/* tslint:enable */' + EOL);
                }
                if (config.tslintDisable === null) {
                    fileData.push('/* tslint:disable */' + EOL);
                }
                else if (config.tslintDisable.length !== 0) {
                    fileData.push('/* tslint:disable:' +
                        config.tslintDisable.join(' ') +
                        ' */' +
                        EOL);
                }
                if (config.tslintEnable && config.tslintEnable.length !== 0) {
                    fileData.push('/* tslint:enable:' +
                        config.tslintEnable.join(' ') +
                        ' */' +
                        EOL);
                }
                fileData.push(x.data.join('\n\n'));
                fileData.push('');
                const formattedFile = prettier.format(fileData.join(' '), {
                    semi: false,
                    parser: 'typescript',
                });
                writeFile(tsfile, formattedFile, err => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(tsfile);
                    }
                });
            });
        });
    }));
})
    .then((files) => Promise.all(files.map(file => {
    return new Promise((resolve, reject) => {
        const realFile = file.replace(/\.[^.]+$/, '');
        rename(file, realFile, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve(realFile);
            }
        });
    });
})))
    .catch(err => {
    console.error(err);
    process.exitCode = 3;
});
//# sourceMappingURL=index.js.map