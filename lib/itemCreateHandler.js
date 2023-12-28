import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { buildTileIndex } from "./geoIndex.js";
import { getDomain } from "./domains.js";
import { HttpError } from "./helpers.js";

/**
 * @typedef {import('@aws-sdk/lib-dynamodb').BatchWriteCommandInput} BatchWriteCommandInput
 */

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const itemCreateHandler = async ({
  params: { domain: domainId },
  event: {
    requestContext: { body },
  },
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

  const { properties, geometry, type } = JSON.parse(body);
  if (type != "Feature") {
    throw new HttpError(400); // FeatureCollection is not supported
  }

  const { dynamodbTableName, zooms } = config;

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

  if (putRequests.length > 25) {
    throw new HttpError(400);
  }

  /** @type BatchWriteCommandInput */
  const commands = {
    RequestItems: {
      [dynamodbTableName]: putRequests,
    },
  };

  await ddbClient.send(new BatchWriteCommand(commands));
  return {
    domainId,
    itemId,
    version: 1,
    type,
    properties,
    geometry,
  };
};
