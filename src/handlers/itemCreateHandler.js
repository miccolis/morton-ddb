import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { buildTileIndex } from "../lib/geoIndex.js";
import { getDomain, updateDomainIndexMetadata } from "../lib/domains.js";
import { HttpError, parseJSONRequest, checkSession } from "../lib/helpers.js";

/**
 * @typedef {import('@aws-sdk/lib-dynamodb').BatchWriteCommandInput} BatchWriteCommandInput
 */

/**
 * @param {import('../types').PathHandlerOptions} options
 * @return{Promise<import('../types').Item>}
 */
export const itemCreateHandler = async ({
  params: { domain: domainId },
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

  const { zoom, owners } = domain;

  if (!owners.includes(username)) {
    throw new HttpError(403);
  }

  const { properties, geometry, type } = parseJSONRequest(event);
  if (type != "Feature") {
    throw new HttpError(400, 'Only GeoJSON "Feature" is supported');
  }

  const { dynamodbTableName } = config;

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

  tiles.forEach((v) => {
    putRequests.push({ PutRequest: { Item: v } });
  });

  if (putRequests.length > config.maxItemIndexSize) {
    throw new HttpError(400, "Cannot index feature");
  }

  for (let i = 0; i < putRequests.length; i += 25) {
    /** @type BatchWriteCommandInput */
    const commands = {
      RequestItems: {
        [dynamodbTableName]: putRequests.slice(i, i + 25),
      },
    };
    // TODO UnprocessedItem handling
    await ddbClient.send(new BatchWriteCommand(commands));
  }

  await updateDomainIndexMetadata({
    domainId,
    config,
    ddbClient,
    countDelta: 1,
    indexDelta: tiles.length,
  });

  return {
    domainId,
    itemId,
    version: 1,
    type,
    properties,
    geometry,
  };
};
