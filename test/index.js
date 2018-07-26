const { wsdl2ts, mergeTypedWsdl, outputTypedWsdl } = require("../lib/wsdl-to-ts");

/** @type {Array.<{0: string; 1: Promise.<string>}>} */
const testResults = [];

// test simple case; disregard result

const wsdl = "https://www2.agenciatributaria.gob.es" +
    "/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/";
const sentWsdl = wsdl + "SuministroFactEmitidas.wsdl";
const rcvdWsdl = wsdl + "SuministroFactRecibidas.wsdl";

testResults.push(["simple", Promise.all([
        wsdl2ts(sentWsdl),
        wsdl2ts(rcvdWsdl),
    ]).
    then((xs) => mergeTypedWsdl.apply(undefined, xs)).
    then(outputTypedWsdl).
    then(() => "OK")
]);

// test cases that need key excaping; write to files

const sii11 = "https://www.agenciatributaria.es" +
    "/static_files/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Modelos_y_formularios/" +
    "Suministro_inmediato_informacion/FicherosSuministros/V_1_1/";
const sii11Sent = sii11 + "SuministroFactEmitidas.wsdl";
const sii11Rcvd = sii11 + "SuministroFactRecibidas.wsdl";

const { readdir, readFile, unlink, writeFile, stat } = require("fs");
const mkdirp = require("mkdirp");

/**
 * @param {string} dir
 * @returns {Promise.<string>}
 */
function mkdirpP(dir) {
    return new Promise((resolve, reject) => {
        mkdirp(dir, (err, made) => {
            if (err) {
                reject(err);
            } else {
                resolve(made);
            }
        });
    });
}

/**
 * @param {string} dir
 * @returns {Promise.<string[]>}
 */
function readdirP(dir) {
    return new Promise((resolve, reject) => {
        readdir(dir, "utf8", (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}

/**
 * @param {string} path
 * @returns {Promise.<object>}
 */
function statP(path) {
    return new Promise((resolve, reject) => {
        stat(path, (err, stats) => {
            if (err) {
                reject(err);
            } else {
                resolve(stats);
            }
        });
    });
}

/**
 * @param {string} file
 * @returns {Promise.<void>}
 */
function rmfileP(file) {
    return new Promise((resolve, reject) => {
        unlink(file, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

/**
 * @param {string} file
 * @param {string} data
 * @returns {Promise.<void>}
 */
function writefileP(file, data) {
    return new Promise((resolve, reject) => {
        writeFile(file, data, "utf8", (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

/**
 * @param {string} file
 * @returns {Promise.<string>}
 */
function readfileP(file) {
    return new Promise((resolve, reject) => {
        readFile(file, "utf8", (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

/**
 * @param {string} dir
 * @returns {Promise.<string[]>}
 */
function requrfile(dir) {
    return readdirP(dir).then((files) => Promise.all(files.map((sf) => {
        const f = dir + "/" + sf;
        return statP(f).then((s) => {
            if (!s.isDirectory()) {
                return [f];
            } else {
                return requrfile(f);
            }
        });
    }))).then((fcoll) => {
        /** @type {string[]} */
        const r = [];
        for (let i = 0; i < fcoll.length; i++) {
            r.push.apply(r, fcoll[i]);
        }
        return r;
    });
}

/**
 * @param {string} dir 
 * @param {RegExp} pattern
 * @returns {Promise.<void>}
 */
function cleandir(dir, pattern) {
    return requrfile(dir).then((files) => {
        const fs = files.filter((f) => pattern.test(f));
        if (fs.length) {
            return Promise.all(fs.map((f) => rmfileP(f))).then(() => undefined);
        }
    });
}

testResults.push(["complex", Promise.all([
        wsdl2ts(sii11Sent, { quoteProperties: true }),
        wsdl2ts(sii11Rcvd),
    ]).
    then((xs) => mergeTypedWsdl.apply(undefined, xs)).
    then(outputTypedWsdl).
    then((xs) => mkdirpP("test/results").
        then(() => cleandir("test/results", /\.ts$/)).
        then(() => Promise.all(xs.map((x) => {
            const f = "test/results/" + x.file + ".d.ts";
            return mkdirpP(f.replace(/\/[^/]+$/, "")).
                then(() => writefileP(f, x.data.join("\n\n")));
        })))
    ).
    then(() => "OK")
]);

// test values in package.json
const package = require("../package.json");

testResults.push(["valid main", !package.main ? Promise.reject("No main field in package.json") :
    readfileP(package.main).then(() => {
        if (!/^(?:.*\/)*lib\//.test(package.main)) {
            throw "Expected main js to be in a folder named `lib` but found: " + JSON.stringify(package.main);
        }
        if (!/\.js$/.test(package.main)) {
            throw "Expected main file to have file extension `.js` but found: " + JSON.stringify(package.main);
        }
        return "OK";
    })
]);

testResults.push(["valid bin", !package.bin ? Promise.reject("No bin field in package.json") :
    !package.bin["wsdl-to-ts"] ? Promise.reject("No wsdl-to-ts property for the bin field in package.json") :
    readfileP(package.bin["wsdl-to-ts"]).then((d) => {
        const f3 = d.substring(0, 3);
        if (!/^(?:.*\/)*lib\//.test(package.bin["wsdl-to-ts"])) {
            throw "Expected bin js to be in a folder named `lib` but found: " + JSON.stringify(package.bin["wsdl-to-ts"]);
        }
        if (!/\.js$/.test(package.bin["wsdl-to-ts"])) {
            throw "Expected bin file to have file extension `.js` but found: " + JSON.stringify(package.bin["wsdl-to-ts"]);
        }
        if (f3 !== "#!/") {
            throw "Expected a hashbang sequence as the first tokens but found: " + JSON.stringify(f3) + " in " + package.bin["wsdl-to-ts"];
        }
        return "OK";
    })
]);

testResults.push(["valid module", !package.module ? Promise.reject("No module field in package.json") :
    readfileP(package.module).then((d) => {
        if (!/^export /m.test(d)) {
            throw "Expected at least one export in the module";
        }
        if (!/^(?:.*\/)*esm\//.test(package.module)) {
            throw "Expected module js to be in a folder named `esm` but found: " + JSON.stringify(package.module);
        }
        if (!/\.m?js$/.test(package.module)) {
            throw "Expected module file to have file extension `.mjs` or `.js` but found: " + JSON.stringify(package.module);
        }
        return "OK";
    })
]);

testResults.push(["valid types", !package.types ? Promise.reject("No types field in package.json") :
    readfileP(package.types).then((d) => {
        if (!/^export /m.test(d)) {
            throw "Expected at least one export in the types";
        }
        if (!/^(?:.*\/)*esm\//.test(package.types)) {
            throw "Expected types source to be in a folder named `esm` but found: " + JSON.stringify(package.types);
        }
        if (!/\.d\.ts$/.test(package.types)) {
            throw "Expected types file to have file extension `.d.ts` but found: " + JSON.stringify(package.types);
        }
        return "OK";
    })
]);

// Run the imossible test

const recursiveWsdl = "https://srv6.demo-attendant.advam.com/makeBooking/webservice/booking.wsdl";
testResults.push(["recursive elements", Promise.all([
        wsdl2ts(recursiveWsdl),
    ]).
    then((xs) => mergeTypedWsdl.apply(undefined, xs)).
    then(outputTypedWsdl).
    then(() => "OK", (e) => {
        if (e && e instanceof RangeError) {
            return "Expected error\n  " + (e.stack || e);
        }
        throw e;
    })
]);

// handle results

testResults.forEach((test) => {
    test[1].then((r) => {
        console.log("Test `%s`:", test[0], r);
    }, (e) => {
        console.error("Test `%s`: FAIL\n ", test[0], e);
        process.exitCode = 1;
    });
});
