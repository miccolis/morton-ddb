import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { HttpError } from "./helpers.js";
import { validateDomain } from "./domains.js";

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

  if (!/^[a-zA-Z0-9-]+$/.test(domainId)) {
    throw new HttpError(400);
  }

  const { name, zoom, access = "private", ttl = 0 } = JSON.parse(body);

  if (zoom === undefined) {
    throw new HttpError(400);
  }

  validateDomain({ name, zoom, access, ttl });

  const item = {
    partition: domainId,
    sort: "domain",
    model: "domain",
    domainId,
    version: 1,
    name,
    zoom,
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
    zoom,
    version: 1,
    access,
    ttl,
  };
};
