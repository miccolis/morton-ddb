import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { buildTileIndex } from "./geoIndex.js";
import { getDomain } from "./domains.js";

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const itemCreateHandler = async ({
  params: { domain: domainId },
  event: {
    requestContext: { body },
  },
  ddbClient,
  config: { dynamodbTableName, zooms },
}) => {
  const domain = await getDomain({
    domainId,
    ddbClient,
    config: { dynamodbTableName },
  });
  if (!domain) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden" }),
      headers: {
        "content-type": "application/json",
      },
    };
  }

  const { properties, geometry, features, type } = JSON.parse(body);
  // TODO validate input

  // Create the main database entry first
  const itemId = uuidv4();
  const item = {
    partition: domainId,
    sort: `item:${itemId}`,
    model: "item",
    domainId,
    itemId,
    version: 1,
    type,
    properties,
    geometry,
    features,
  };

  /** @type {Array<{PutRequest: { Item: Record<string, any> }}>} */
  const putRequests = [
    {
      PutRequest: { Item: item },
    },
  ];

  // ...then a set of indexed database records.
  const zoom = zooms[0];
  const tiles = buildTileIndex({ feature: item, zoom }).map(
    ({ morton, x, y }) => ({
      partition: `${domainId}:${itemId}`,
      sort: `${morton}`,
      indexedDomain: `${domainId}:${zoom}`,
      itemId,
      morton,
      x,
      y,
    }),
  );

  // TODO add condition that prevents overwritting (v. unlikely b/c using uuids)

  tiles.forEach((v) => {
    putRequests.push({ PutRequest: { Item: v } });
  });

  // TODO spread more than 25 writes across multiple requests

  /** @type {Record<string, Array<{PutRequest: { Item: Record<string, any> }}>>} */
  const requestItems = {};
  requestItems[dynamodbTableName] = putRequests;

  await ddbClient.send(
    new BatchWriteCommand({
      RequestItems: requestItems,
    }),
  );
  return {
    domainId,
    itemId,
    version: 1,
    type,
    properties,
    geometry,
    features,
  };
};
