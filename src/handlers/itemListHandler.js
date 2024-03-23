import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDomain } from "../lib/domains.js";
import { HttpError } from "../lib/helpers.js";

/**
 * @param {import('../types').PathHandlerOptions} options
 * @return {Promise<import('../types').ItemCollection>}
 */
export const itemListHandler = async ({
  params: { domain: domainId },
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

  const { dynamodbTableName } = config;

  // TODO pagination
  const { Items: items } = await ddbClient.send(
    new QueryCommand({
      TableName: dynamodbTableName,
      KeyConditionExpression:
        "#partition = :domainId and begins_with(#sort, :model)",
      ExpressionAttributeNames: {
        "#partition": "partition",
        "#sort": "sort",
      },
      ExpressionAttributeValues: {
        ":domainId": domainId,
        ":model": "item",
      },
    }),
  );

  return {
    query: {
      domain: domainId,
    },
    type: "FeatureCollection",
    features: items.map(
      ({
        domainId,
        itemId,
        version,
        type,
        properties,
        geometry,
        features,
      }) => ({
        domainId,
        itemId,
        version,
        type,
        properties,
        geometry,
        features,
      }),
    ),
  };
};
