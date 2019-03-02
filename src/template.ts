export default class Templates {
  public static serviceHeaderTemplate(body: any) {
    return `import { BaseSoapService } from '../../wsdl.client';
import { RecursivePartial } from '../../wsdl.types';

export class ${body.serviceName} extends BaseSoapService {

private serviceName = "${body.serviceName}";
private static readonly defaultEndpoint = "${body.defaultEndpoint}";
constructor() {
    super();
}

async createClient(endpoint: string, options: IOptions & IArSoapOptions): Promise<void> {
    return this.createClientAsync( __dirname + "${body.wsdlLocation}", endpoint, options);
}
  `;
  }

  public static serviceImportTemplate(body: any) {
    return `import { I${body.methodName}Input, I${
      body.methodName
    }Output } from "./${body.serviceName}Types";`;
  }
  public static serviceMethodTemplate(body: any) {
    return `async ${body.methodName}(
  inputData: RecursivePartial<I${body.methodName}Input>,
  options?: object,
  extraHeaders?: object
  ): Promise<{
    result: I${body.methodName}Output;
    rawResponse: string;
    soapHeader: { [k: string]: any };
    rawRequest: string;
  }> {
  return await this.executeSoapMethod(I${body.methodName}Input, "${
      body.methodName
    }", inputData, options, extraHeaders);
}`;
  }
}