import { QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { getDomain, updateDomainIndexMetadata } from "../lib/domains.js";
import {
  HttpError,
  checkSession,
  dynamoDBQueryFetchAll,
} from "../lib/helpers.js";

/**
 * @typedef {import('@aws-sdk/lib-dynamodb').BatchWriteCommandInput} BatchWriteCommandInput
 */

/**
 * @param {import('../types').PathHandlerOptions} options
 */
export const itemDeleteHandler = async ({
  params: { domain: domainId, item: itemId },
  event,
  ddbClient,
  config,
}) => {
  const { sub: username } = await checkSession(event, config.jwtSecret);

  const domain = await getDomain({
    domainId,
    ddbClient,
    config,
  });
  if (!domain) {
    throw new HttpError(403);
  }

  const { owners } = domain;

  if (!owners.includes(username)) {
    throw new HttpError(403);
  }

  /** @type {Array<{DeleteRequest: { Key: Record<string, string|number> }}>} */
  const deleteRequests = [
    {
      DeleteRequest: {
        Key: {
          partition: domainId,
          sort: `item:${itemId}`,
        },
      },
    },
  ];

  const { dynamodbTableName } = config;

  const items = await dynamoDBQueryFetchAll(
    ddbClient,
    new QueryCommand({
      TableName: dynamodbTableName,
      KeyConditionExpression: "#partition = :partition",
      ExpressionAttributeNames: {
        "#partition": "partition",
      },
      ExpressionAttributeValues: {
        ":partition": `${domainId}:${itemId}`,
      },
    }),
  );

  for (const { partition, sort } of items) {
    deleteRequests.push({ DeleteRequest: { Key: { partition, sort } } });
  }

  // If there is only one request we didn't find anything in our index.
  if (deleteRequests.length === 1) {
    throw new HttpError(404);
  }

  if (deleteRequests.length > config.maxItemIndexSize) {
    throw new HttpError(500);
  }

  await updateDomainIndexMetadata({
    domainId,
    ddbClient,
    config,
    countDelta: -1,
    indexDelta: -items.length,
  });

  for (let i = 0; i < deleteRequests.length; i += 25) {
    /** @type BatchWriteCommandInput */
    const commands = {
      RequestItems: {
        [dynamodbTableName]: deleteRequests.slice(i, i + 25),
      },
    };
    // TODO add UnprocessedItems handling
    await ddbClient.send(new BatchWriteCommand(commands));
  }

  return {};
};
