import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { HttpError, parseJSONRequest, extractAllowedProperties } from "./helpers.js";
import { validateDomain } from "./domains.js";

/**
 * @typedef {import('./types').Domain } Domain
 * @typedef {import('./types').DynamoDBReturnValue} DynamoDBReturnValue
 */

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const domainUpdateHandler = async ({
  params: { domain: domainId },
  event,
  ddbClient,
  config: { dynamodbTableName },
}) => {
  /** @type Partial<Domain> */
  const domainUpdates = extractAllowedProperties(parseJSONRequest(event), [
    "name",
    "access",
    "ttl",
    "version",
  ]);

  validateDomain(domainUpdates, true);

  const { version, ...fieldValues } = domainUpdates;

  if (!version) {
    throw new HttpError(400, 'Property "version" is required');
  }

  const update = {
    TableName: dynamodbTableName,
    Key: {
      partition: domainId,
      sort: "domain",
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
      Attributes: { name, version, access, ttl },
    } = await ddbClient.send(new UpdateCommand(update));

    return {
      domainId,
      name,
      version,
      access,
      ttl,
    };
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") {
      throw new HttpError(409);
    } else {
      throw e;
    }
  }
};
