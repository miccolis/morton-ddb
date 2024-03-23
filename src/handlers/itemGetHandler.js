import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDomain, validateDomainAccess } from "../lib/domains.js";
import { HttpError, getCurrentUser } from "../lib/helpers.js";

/**
 * @param {import('../types').PathHandlerOptions} options
 * @return {Promise<import('../types').Item>}
 */
export const itemGetHandler = async ({
  params: { domain: domainId, item: itemId },
  event,
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

  const username = await getCurrentUser(event, config.jwtSecret);

  validateDomainAccess({ domain, username });

  const { Item: item } = await ddbClient.send(
    new GetCommand({
      TableName: config.dynamodbTableName,
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
