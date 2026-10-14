import {
  validationMetadatasToSchemas,
  targetConstructorToSchema,
} from 'class-validator-jsonschema';
import { ValidationTypes } from 'class-validator';
// @ts-ignore
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import { socialIntegrationList } from '@gitroom/nestjs-libraries/integrations/integration.manager';

export function getValidationSchemas() {
  return validationMetadatasToSchemas({
    classTransformerMetadataStorage: defaultMetadataStorage,
    additionalConverters: {
      [ValidationTypes.NESTED_VALIDATION]: (meta, options) => {
        if (typeof meta.target === 'function') {
          const typeMeta = options.classTransformerMetadataStorage
            ? options.classTransformerMetadataStorage.findTypeMetadata(
                meta.target,
                meta.propertyName
              )
            : null;
          if (typeMeta) {
            const childType = typeMeta.typeFunction();
            return targetConstructorToSchema(childType, options);
          }
        }
        return {};
      },
    },
  });
}

// Channels the ChatGPT directory toolset posts to. Their settings are a static
// schema: nothing in them is an id that only a call to the provider returns
// (a provider helper they need is its own tool, see @Tool `directory`)
export const directoryProviders = [
  'facebook',
  'instagram',
  'instagram-standalone',
  'linkedin',
  'linkedin-page',
  'threads',
  'tiktok',
  'tiktok-business',
  'x',
  'youtube',
];

// A DTO schema as strict as a directory listing asks: every object closed, the
// $ref a custom validator leaves behind dropped, "url" as the standard "uri"
const strictSchema = (schema: any): any => {
  if (Array.isArray(schema)) {
    return schema.map(strictSchema);
  }
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const { $ref, ...rest } = schema;
  const strict = Object.fromEntries(
    Object.entries(rest).map(([key, value]) => [
      key,
      key === 'format' && value === 'url' ? 'uri' : strictSchema(value),
    ])
  );
  return strict.type === 'object'
    ? { properties: {}, ...strict, additionalProperties: false }
    : strict;
};

// One variant per settings DTO (channels that share one share the variant),
// built once at startup so the listing is static. `partial` is for updates,
// where only the keys that change are passed
export function directoryChannelSchemas(
  rules: Record<string, string>,
  partial = false
) {
  const schemas = getValidationSchemas();
  const providers = socialIntegrationList.filter((p) =>
    directoryProviders.includes(p.identifier)
  );

  return Object.values(
    providers.reduce((all, provider) => {
      const key = provider.dto?.name || provider.identifier;
      return { ...all, [key]: [...(all[key] || []), provider] };
    }, {} as Record<string, typeof providers>)
  ).map((group) => {
    const dto = group[0].dto;
    const { required, ...settings } = strictSchema(
      dto ? schemas[dto.name] : { type: 'object' }
    );

    return {
      platforms: group.map((p) => p.identifier),
      description: group
        .map((p) => {
          const max = p.maxLength(false);
          const premium = p.maxLength(true);
          return `${p.identifier} (${p.name.replace(/\s+/g, ' ')}): up to ${max} characters${
            premium !== max ? ` (${premium} with a premium account)` : ''
          }. ${rules[p.identifier] || ''}`.trim();
        })
        .join('\n'),
      settings: partial || !required ? settings : { ...settings, required },
    };
  });
}

// What a channel outside directoryProviders answers with
export const directoryUnsupportedMessage = () =>
  `Only ${socialIntegrationList
    .filter((p) => directoryProviders.includes(p.identifier))
    .map((p) => p.name.replace(/\s+/g, ' '))
    .filter((name, index, all) => all.indexOf(name) === index)
    .join(', ')} channels can be scheduled from ChatGPT. Schedule posts to this channel in the Tadween app.`;
