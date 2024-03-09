import {
  UpdateCommand,
  BatchWriteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { getDomain } from "./domains.js";
import { buildTileIndex } from "./geoIndex.js";
import {
  HttpError,
  parseJSONRequest,
  extractAllowedProperties,
  checkSession,
} from "./helpers.js";

/**
 * @typedef {import('@aws-sdk/lib-dynamodb').BatchWriteCommandInput} BatchWriteCommandInput
 * @typedef {import('./types').DynamoDBReturnValue} DynamoDBReturnValue
 * @typedef {import('./types').Item} Item
 */

/**
 * @param {import('./types').PathHandlerOptions} options
 * @return{Promise<import('./types').Item>}
 */
export const itemUpdateHandler = async ({
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

  const { zoom, owners } = domain;

  if (!owners.includes(username)) {
    throw new HttpError(403);
  }

  const { dynamodbTableName } = config;

  /** @type Partial<Item> */
  const itemUpdates = extractAllowedProperties(parseJSONRequest(event), [
    "properties",
    "geometry",
    "version",
  ]);

  // TODO better validation

  const { version, ...fieldValues } = itemUpdates;

  if (!version) {
    throw new HttpError(400, 'Property "version" is required');
  }

  const update = {
    TableName: dynamodbTableName,
    Key: {
      partition: domainId,
      sort: `item:${itemId}`,
    },
    UpdateExpression: "SET #version = #version + :inc",
    ConditionExpression: "#version = :version",
    ExpressionAttributeNames: {
      "#version": "version",
    },
    ExpressionAttributeValues: {
      ":version": version,
      ":inc": 1,
    },
    ReturnValues: /** @type DynamoDBReturnValue */ ("ALL_NEW"),
  };

  {
    let i = 0;
    for (const key in fieldValues) {
      i++;
      update.UpdateExpression += `, #key${i} = :val${i}`;
      update.ExpressionAttributeNames[`#key${i}`] = key;
      update.ExpressionAttributeValues[`:val${i}`] = fieldValues[key];
    }
  }

  const indexUpdates = [];
  if (fieldValues.geometry) {
    const newTiles = new Map();
    const deleteList = [];

    for (const v of buildTileIndex({ feature: fieldValues, zoom })) {
      newTiles.set(v.morton, v);
    }

    const { Items: existingTiles } = await ddbClient.send(
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

    for (const v of existingTiles) {
      if (newTiles.has(v.morton)) {
        newTiles.delete(v.morton);
      } else {
        deleteList.push(v);
      }
    }

    for (const { partition, sort } of deleteList) {
      indexUpdates.push({ DeleteRequest: { Key: { partition, sort } } });
    }

    for (const { morton, x, y } of newTiles.values()) {
      indexUpdates.push({
        PutRequest: {
          Item: {
            partition: `${domainId}:${itemId}`,
            sort: `${morton}`,
            indexedDomain: `${domainId}:${zoom}`,
            itemId,
            morton,
            x,
            y,
          },
        },
      });
    }
  }

  try {
    // It takes two commands to fully update a item when the geometry changes. First we update the
    // item itself, then issue the creats and deletes to indexed records. There is a chance the
    // that the later coule fail. In the future a method should be provided to force repair the
    // index so that a item can be recovered without being deleted.
    const {
      Attributes: { type, properties, geometry, version },
    } = await ddbClient.send(new UpdateCommand(update));

    if (indexUpdates.length > 0) {
      /** @type BatchWriteCommandInput */
      const commands = {
        RequestItems: {
          [dynamodbTableName]: indexUpdates,
        },
      };
      await ddbClient.send(new BatchWriteCommand(commands));
    }

    return {
      domainId,
      itemId,
      version,
      type,
      properties,
      geometry,
    };
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") {
      throw new HttpError(409);
    } else {
      throw e;
    }
  }
};
