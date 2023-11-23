import { QueryCommand } from "@aws-sdk/lib-dynamodb";

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const itemListHandler = async ({
  params: { domain: domainId },
  ddbClient,
  config: { dynamodbTableName },
}) => {
  // TODO validate domain
  // TODO access control
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
