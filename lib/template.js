"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Templates {
    static serviceHeaderTemplate(body) {
        return `import { BaseSoapService, IArSoapOptions } from '../../wsdl.client';
import { RecursivePartial } from '../../wsdl.types';
import { IOptions } from 'soap';

export class ${body.serviceName} extends BaseSoapService {

private serviceName = "${body.serviceName}";
private static readonly defaultEndpoint = "${body.defaultEndpoint}";
constructor() {
    super();
}

async createClientAsync(endpoint: string, options: IOptions & IArSoapOptions): Promise<void> {
    return this.createClientWithWsdlPathAsync( __dirname + "${body.wsdlLocation}", endpoint, options);
}
  `;
    }
    static serviceImportTemplate(body) {
        return `import { I${body.methodName}Input, I${body.methodName}Output } from "${body.relativeTypesPath}";`;
    }
    static serviceMethodTemplate(body) {
        return `async ${body.methodName}Async(
  inputData: RecursivePartial<I${body.methodName}Input>,
  options?: object,
  extraHeaders?: object
  ): Promise<{
    result: I${body.methodName}Output;
    rawResponse: string;
    soapHeader: { [k: string]: any };
    rawRequest: string;
  }> {
  return await this.executeSoapMethod(I${body.methodName}Input, "${body.methodName}", inputData, options, extraHeaders);
}`;
    }
}
exports.default = Templates;
//# sourceMappingURL=template.js.map