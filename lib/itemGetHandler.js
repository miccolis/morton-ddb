import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDomain, validateDomainAccess } from "./domains.js";
import { HttpError } from "./helpers.js";

/**
 * @param {import('./types').PathHandlerOptions} options
 * @return {Promise<import('./types').Item>}
 */
export const itemGetHandler = async ({
  params: { domain: domainId, item: itemId },
  ddbClient,
  config,
}) => {
  const domain = await getDomain({
    domainId,
    ddbClient,
    config,
  });
  if (!domain) {
    throw new HttpError(403);
  }

  const { dynamodbTableName, mode } = config;

  validateDomainAccess({ domain, mode });

  const { Item: item } = await ddbClient.send(
    new GetCommand({
      TableName: dynamodbTableName,
      Key: {
        partition: domainId,
        sort: `item:${itemId}`,
      },
    }),
  );

  if (!item) {
    throw new HttpError(404);
  }

  const { version, type, properties, geometry } = item;

  return {
    domainId,
    itemId,
    version,
    type,
    properties,
    geometry,
  };
};
