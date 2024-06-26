import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  HttpError,
  parseJSONRequest,
  extractAllowedProperties,
  checkSession,
} from "../lib/helpers.js";
import { validateDomain } from "../lib/domains.js";

/**
 * @typedef {import('../types').Domain } Domain
 * @typedef {import('../types').DynamoDBReturnValue} DynamoDBReturnValue
 */

/**
 * @param {import('../types').PathHandlerOptions} options
 */
export const domainUpdateHandler = async ({
  params: { domain: domainId },
  event,
  ddbClient,
  config: { dynamodbTableName, jwtSecret },
}) => {
  const { sub: username } = await checkSession(event, jwtSecret);

  /** @type Partial<Domain> */
  const domainUpdates = extractAllowedProperties(parseJSONRequest(event), [
    "name",
    "access",
    "ttl",
    "version",
  ]);

  validateDomain(domainUpdates, true);

  const { version, ...fieldValues } = domainUpdates;

  const update = {
    TableName: dynamodbTableName,
    Key: {
      partition: "_domain",
      sort: domainId,
    },
    UpdateExpression: "SET #version = #version + :inc",
    ConditionExpression: "#version = :version AND contains(#owners, :username)",
    ExpressionAttributeNames: {
      "#version": "version",
      "#owners": "owners",
    },
    ExpressionAttributeValues: {
      ":version": version,
      ":inc": 1,
      ":username": username,
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
