const { wsdl2ts, mergeTypedWsdl, outputTypedWsdl } = require("../lib/wsdl-to-ts");


const wsdl = "https://www2.agenciatributaria.gob.es" +
    "/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/";
const sentWsdl = wsdl + "SuministroFactEmitidas.wsdl";
const rcvdWsdl = wsdl + "SuministroFactRecibidas.wsdl";

Promise.all([
    wsdl2ts(sentWsdl),
    wsdl2ts(rcvdWsdl),
]).
    then((xs) => mergeTypedWsdl.apply(undefined, xs)).
    then(outputTypedWsdl).
    then((xs) => xs.forEach((x) => {
        console.log("-- %s --", x.file);
        console.log("%s", x.data.join("\n\n"));
    })).
    catch(console.error);
