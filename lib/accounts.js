import { GetCommand } from "@aws-sdk/lib-dynamodb";

/**
 * @typedef {import('./types').Account} Account
 * @typedef {import('./types').Config} Config
 */

/**
 * @param {object} options
 * @param {string} options.username
 * @param {any} options.ddbClient
 * @param {Config} options.config
 * @return {Promise<Account>}
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
