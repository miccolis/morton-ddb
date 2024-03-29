import bcryptjs from "bcryptjs";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  HttpError,
  parseJSONRequest,
  extractAllowedProperties,
  checkSession,
} from "../lib/helpers.js";
import { validateAccount } from "../lib/accounts.js";

const { genSalt, hash } = bcryptjs;

/**
 * @typedef {import('../types').Account } Account
 * @typedef {import('../types').StoredAccount } StoredAccount
 * @typedef {import('../types').DynamoDBReturnValue} DynamoDBReturnValue
 * @typedef {import('../types').PathHandlerOptions} PathHandlerOptions
 */

/**
 * @param {PathHandlerOptions} options
 * @return {Promise<Account>}
 */
export const accountUpdateHandler = async ({
  params: { account: username },
  event,
  ddbClient,
  config: { dynamodbTableName, jwtSecret },
}) => {
  const { sub } = await checkSession(event, jwtSecret);

  if (sub !== username) {
    throw new HttpError(403);
  }

  /** @type Partial<StoredAccount> */
  const accountUpdates = extractAllowedProperties(parseJSONRequest(event), [
    "password",
    "version",
  ]);

  validateAccount(accountUpdates);

  const { version, password, ...fieldValues } = accountUpdates;

  const salt = await genSalt(10);

  fieldValues.passwordHash = await hash(password, salt);
  fieldValues.passwordResetRequired = false;

  const update = {
    TableName: dynamodbTableName,
    Key: {
      partition: "_accounts",
      sort: username,
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
      Attributes: { username, email, created, version },
    } = await ddbClient.send(new UpdateCommand(update));

    return {
      username,
      email,
      created,
      version,
    };
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") {
      throw new HttpError(409);
    } else {
      throw e;
    }
  }
};
