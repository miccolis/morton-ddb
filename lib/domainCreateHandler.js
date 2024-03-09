import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { HttpError, parseJSONRequest, checkSession } from "./helpers.js";
import { validateDomain } from "./domains.js";

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const domainCreateHandler = async ({
  params: { domain: domainId },
  event,
  ddbClient,
  config: { dynamodbTableName, jwtSecret },
}) => {
  const { sub: username } = await checkSession(event, jwtSecret);

  if (!/^[a-zA-Z0-9-]+$/.test(domainId)) {
    throw new HttpError(400);
  }

  const { name, zoom, access = "private", ttl = 0 } = parseJSONRequest(event);

  validateDomain({ name, zoom, access, ttl });

  const owners = [username];

  const item = {
    partition: domainId,
    sort: "domain",
    model: "domain",
    domainId,
    name,
    zoom,
    owners,
    version: 1,
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
    owners,
    version: 1,
    access,
    ttl,
  };
};
