"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Templates {
    static serviceHeaderTemplate(body) {
        return `import { BaseSoapService, IArSoapOptions } from '../../../lib/wsdl.client';
import { RecursivePartial } from 'common/nestjs-core/src/utils/recursive-partial';
import { IOptions } from 'soap';
import * as path from 'path';
import { ArApiLogger } from 'common/nestjs-core/src/services/ar-api-logger';


export class ${body.serviceName} extends BaseSoapService {

private serviceName = "${body.serviceName}";
private static readonly defaultEndpoint = "${body.defaultEndpoint}";
constructor() {
    super();
}

async initializeClientAsync(
    wsdlBasePath: string,
    endpoint: string,
    options: IOptions & IArSoapOptions,
  ): Promise<void> {
    return this.createClientWithWsdlPathAsync( path.join(wsdlBasePath, "${body.wsdlLocation}"), endpoint, options);
}
  `;
    }
    static serviceImportTemplate(body) {
        return `import { I${body.methodName}Input, I${body.methodName}Output } from "${body.relativeTypesPath}";`;
    }
    static serviceMethodTemplate(body) {
        return `  async ${body.methodName}Async(
    inputData: RecursivePartial<I${body.methodName}Input>,
    logger: ArApiLogger,
    options?: object,
    extraHeaders?: object
  ): Promise<{
    result: I${body.methodName}Output;
    rawResponse: string;
    soapHeader: { [k: string]: any };
    rawRequest: string;
  }> {
    return await this.executeSoapMethod<I${body.methodName}Input, I${body.methodName}Output>(
      I${body.methodName}Input,
      "${body.methodName}",
      inputData,
      logger,
      options,
      extraHeaders);
  }`;
    }
}
exports.default = Templates;
//# sourceMappingURL=template.js.map