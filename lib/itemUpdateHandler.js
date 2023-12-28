import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDomain, validateDomainAccess } from "./domains.js";
import { HttpError, extractAllowedProperties } from "./helpers.js";

/**
 * @typedef {import('./types').Item} Item
 * @typedef {import('./types').DynamoDBReturnValue} DynamoDBReturnValue
 */

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const itemUpdateHandler = async ({
  params: { domain: domainId, item: itemId },
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

  const { dynamodbTableName, mode } = config;

  validateDomainAccess({ domain, mode });

  /** @type Partial<Item> */
  const itemUpdates = extractAllowedProperties(body, [
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

  try {
    const {
      Attributes: { type, properties, geometry, version },
    } = await ddbClient.send(new UpdateCommand(update));
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
