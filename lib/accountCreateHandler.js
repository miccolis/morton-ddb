import { hash } from "bcrypt";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { HttpError, parseJSONRequest, checkSession } from "./helpers.js";

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const accountCreateHandler = async ({
  event,
  ddbClient,
  config: { dynamodbTableName, jwtSecret },
}) => {
  checkSession(event, jwtSecret);

  const { username, password, email } = parseJSONRequest(event);

  // TODO validate
  // if (!/^[a-zA-Z0-9-]+$/.test(username)) {
  //   throw new HttpError(400);
  // }

  const passwordHash = await hash(password, 10);

  const item = {
    partition: "_accounts",
    sort: username,
    model: "account",
    version: 1,
    username,
    email,
    passwordHash,
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
    version: 1,
  };
};
