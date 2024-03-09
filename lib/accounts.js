import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { HttpError } from "./helpers.js";

/**
 * @typedef {import('./types').Account} Account
 * @typedef {import('./types').StoredAccount} StoredAccount
 * @typedef {import('./types').Config} Config
 */

/**
 * @param {object} options
 * @param {string} options.username
 * @param {any} options.ddbClient
 * @param {Config} options.config
 * @return {Promise<StoredAccount>}
 */
export const getAccount = async ({
  username,
  ddbClient,
  config: { dynamodbTableName },
}) => {
  const { Item: item } = await ddbClient.send(
    new GetCommand({
      TableName: dynamodbTableName,
      Key: {
        partition: "_accounts",
        sort: username,
      },
    }),
  );
  if (item) {
    return item;
  } else {
    return undefined;
  }
};

/**
 * @param {Partial<Account>} options
 * @param {boolean?} allowPartial
 */
export function validateAccount(
  { username, email, password, version },
  allowPartial = false,
) {
  if (allowPartial && username !== undefined) {
    throw new HttpError(400, "username update is not supported");
  }

  if (!/^[a-zA-Z0-9-]+$/.test(username)) {
    throw new HttpError(400);
  }

  if (allowPartial && email !== undefined) {
    throw new HttpError(400, "email update is not supported");
  }
  // TODO validate email

  if (password === undefined && !allowPartial) {
    throw new HttpError(400);
  }

  // TODO validate password, maybe use zxcvbn-ts

  if (version !== undefined && !Number.isInteger(version)) {
    throw new HttpError(400, 'Property "version" must be an integer value');
  }
}
