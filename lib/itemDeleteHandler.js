import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const itemDeleteHandler = async ({
  params: { domain: domainId, item: itemId },
  ddbClient,
  config: { dynamodbTableName },
}) => {
  // TODO validate domain
  // TODO access control
  // TODO clean up indexed records
  await ddbClient.send(
    new DeleteCommand({
      TableName: dynamodbTableName,
      Key: {
        partition: domainId,
        sort: `item:${itemId}`,
      },
    }),
  );
  return {};
};
