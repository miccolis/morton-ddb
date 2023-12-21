import { GetCommand } from "@aws-sdk/lib-dynamodb";

/*
 * @typedef {import('./types').Response} Response
 */

/**
 * @param {object} options
 * @param {string} options.domainId
 * @param {any} options.ddbClient
 * @param {any} options.config
 */
export const getDomain = async ({
  domainId,
  ddbClient,
  config: { dynamodbTableName },
}) => {
  const { Item: item } = await ddbClient.send(
    new GetCommand({
      TableName: dynamodbTableName,
      Key: {
        partition: domainId,
        sort: "domain",
      },
    }),
  );
  if (item) {
    return {
      domainId: item.domainId,
      name: item.name,
      access: item.access ?? "private",
      ttl: item.ttl ?? 0,
      version: item.version,
    };
  } else {
    return undefined;
  }
};

/**
 * @param {object} options
 * @param {any} options.domain
 * @param {string} options.mode
 */
export function validateDomainAccess({ domain, mode }) {
  if (!domain || (domain.access == "private" && mode !== "read_write")) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden" }),
      headers: {
        "content-type": "application/json",
      },
    };
  } else {
    return false;
  }
}
