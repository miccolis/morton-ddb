import bcryptjs from "bcryptjs";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { HttpError, parseJSONRequest, checkSession } from "../lib/helpers.js";
import { validateAccount } from "../lib/accounts.js";

const { genSalt, hash } = bcryptjs;

/**
 * @param {import('../types').PathHandlerOptions} options
 * @return {Promise<import('../types').Account>}
 */
export const accountCreateHandler = async ({
  event,
  ddbClient,
  config: { dynamodbTableName, jwtSecret },
}) => {
  await checkSession(event, jwtSecret);

  const { username, password, email } = parseJSONRequest(event);

  validateAccount({ username, password, email });

  const salt = await genSalt(10);

  /** @type {import('../types').StoredAccount} */
  const item = {
    partition: "_accounts",
    sort: username,
    model: "account",
    version: 1,
    username,
    email,
    // TODO emailVerified
    created: new Date().toISOString(),
    passwordHash: await hash(password, salt),
    passwordResetRequired: true,
  };

  try {
    await ddbClient.send(
      new PutCommand({
        TableName: dynamodbTableName,
        Item: item,
        ConditionExpression:
          "attribute_not_exists(#partition) AND attribute_not_exists(#sort)",
        ExpressionAttributeNames: {
          "#partition": "partition",
          "#sort": "sort",
        },
      }),
    );
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") {
      throw new HttpError(409);
    } else {
      throw e;
    }
  }

  return {
    username,
    email,
    version: item.version,
    created: item.created,
  };
};
