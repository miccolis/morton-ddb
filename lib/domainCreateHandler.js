import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { HttpError } from './helpers.js';

export function validateDomain({ name, access, ttl }) {
  if (typeof name !== "string" || name.length > 64) {
    throw new HttpError(400);
  }
  if (access !== undefined && access !== "public" && access !== "private") {
    throw new HttpError(400);
  }
  if (ttl !== undefined && !Number.isInteger(ttl)) {
    throw new HttpError(400);
  }
}

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const domainCreateHandler = async ({
  params: { domain: domainId },
  event: {
    requestContext: { body },
  },
  ddbClient,
  config: { dynamodbTableName },
}) => {
  // TODO access control

  const { name, access, ttl } = JSON.parse(body);

  validateDomain({ name, access, ttl });

  const item = {
    partition: domainId,
    sort: "domain",
    model: "domain",
    domainId,
    version: 1,
    name,
    access,
    ttl,
  };

  try {
    await ddbClient.send(
      new PutCommand({
        TableName: dynamodbTableName,
        Item: item,
        ConditionExpression:
          "attribute_not_exists(#partition) AND attribute_not_exists(#sort)",
        ExpressionAttributeNames: {
          "#partition": "partition",
          "#sort": "sort",
        },
      }),
    );
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") {
      throw new HttpError(409);
    } else {
      throw e;
    }
  }

  return {
    domainId,
    name,
    version: 1,
    access,
    ttl,
  };
};
