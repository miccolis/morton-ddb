import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { checkSession } from "../lib/helpers.js";

/**
 * @param {import('../types').PathHandlerOptions} options
 * @return {Promise<{ domains: Array<Partial<import('../types').Domain>>}>}
 */
export const domainListHandler = async ({ event, ddbClient, config }) => {
  const { sub: username } = await checkSession(event, config.jwtSecret);

  const { dynamodbTableName } = config;

  // TODO pagination
  const { Items: domains } = await ddbClient.send(
    new QueryCommand({
      TableName: dynamodbTableName,
      KeyConditionExpression: "#partition = :partition",
      FilterExpression: "#access = :public OR contains(owners, :username)",
      ExpressionAttributeNames: {
        "#partition": "partition",
        "#access": "access",
      },
      ExpressionAttributeValues: {
        ":partition": "_domain",
        ":public": "public",
        ":username": username,
      },
    }),
  );

  return {
    domains: domains.map(({ domainId, version, name }) => ({
      domainId,
      version,
      name,
    })),
  };
};
