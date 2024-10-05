import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { HttpError, checkSession } from "../lib/helpers.js";

/**
 * @param {import('../types').PathHandlerOptions} options
 * @return {Promise<{ domains: Array<Partial<import('../types').Domain>>}>}
 */
export const domainListHandler = async ({ event, ddbClient, config }) => {
  let username;
  try {
    const { sub } = await checkSession(event, config.jwtSecret);
    username = sub;
  } catch (err) {
    if (err instanceof HttpError && err.statusCode === 403) {
      // continue unauthenticated.
    } else {
      throw err;
    }
  }
  const { dynamodbTableName } = config;

  const queryInput = {
    TableName: dynamodbTableName,
    KeyConditionExpression: "#partition = :partition",
    FilterExpression: "#access = :public",
    ExpressionAttributeNames: {
      "#partition": "partition",
      "#access": "access",
    },
    ExpressionAttributeValues: {
      ":partition": "_domain",
      ":public": "public",
    },
  };

  if (username) {
    queryInput.FilterExpression += " OR contains(owners, :username)";
    queryInput.ExpressionAttributeValues[":username"] = username;
  }

  // TODO pagination
  const { Items: domains } = await ddbClient.send(new QueryCommand(queryInput));

  return {
    domains: domains.map(
      ({ domainId, name, created, zoom, owners, ttl, access, version }) => ({
        domainId,
        name,
        created,
        zoom,
        owners,
        access,
        version,
        ttl,
      }),
    ),
  };
};
