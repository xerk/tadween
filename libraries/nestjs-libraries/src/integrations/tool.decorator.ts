import 'reflect-metadata';

export function Tool(params: {
  description: string;
  dataSchema: Array<{
    key: string;
    type: string;
    description: string;
    // the values the key takes, when there is a fixed list
    enum?: string[];
  }>;
  // Served as its own read-only tool on the ChatGPT directory endpoint, which
  // lists no generic "call a provider function" tool: a fixed name, a title and
  // the fields of every item it returns
  directory?: {
    name: string;
    title: string;
    output: Record<string, 'string' | 'number'>;
  };
}) {
  return function (target: any, propertyKey: string | symbol) {
    // Retrieve existing metadata or initialize an empty array
    const existingMetadata = Reflect.getMetadata('custom:tool', target) || [];

    // Add the metadata information for this method
    existingMetadata.push({ methodName: propertyKey, ...params });

    // Define metadata on the class prototype (so it can be retrieved from the class)
    Reflect.defineMetadata('custom:tool', existingMetadata, target);
  };
}
