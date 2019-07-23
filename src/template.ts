export default class Templates {
  public static serviceHeaderTemplate(body: any) {
    return `import { BaseSoapService, IArSoapOptions } from '../../wsdl.client';
import { RecursivePartial } from '../../wsdl.types';
import { IOptions } from 'soap';
import * as path from 'path';

export class ${body.serviceName} extends BaseSoapService {

private serviceName = "${body.serviceName}";
private static readonly defaultEndpoint = "${body.defaultEndpoint}";
constructor() {
    super();
}

async createClientAsync(endpoint: string, options: IOptions & IArSoapOptions): Promise<void> {
    return this.createClientWithWsdlPathAsync( path.join(__dirname, "${body.wsdlLocation}"), endpoint, options);
}
  `;
  }

  public static serviceImportTemplate(body: any) {
    return `import { I${body.methodName}Input, I${body.methodName}Output } from "${body.relativeTypesPath}";`;
  }
  public static serviceMethodTemplate(body: any) {
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
  return await this.executeSoapMethod<I${body.methodName}Input, I${body.methodName}Output>(I${body.methodName}Input, "${
      body.methodName
    }", inputData, options, extraHeaders);
}`;
  }
}
