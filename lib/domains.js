import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { HttpError } from "./helpers.js";

/**
 * @typedef {import('./types').Domain} Domain
 * @typedef {import('./types').Config} Config
 */

/**
 * @param {object} options
 * @param {string} options.domainId
 * @param {any} options.ddbClient
 * @param {Config} options.config
 * @return {Promise<Domain>}
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
 * @param {Partial<Domain>} options
 * @param {boolean?} allowPartial
 */
export function validateDomain(
  { name, access, ttl, version },
  allowPartial = false,
) {
  if (
    (!(name === undefined && allowPartial) && typeof name !== "string") ||
    name.length > 64
  ) {
    throw new HttpError(400);
  }
  if (
    !(access === undefined && allowPartial) &&
    access !== "public" &&
    access !== "private"
  ) {
    throw new HttpError(400);
  }
  if (ttl !== undefined && !Number.isInteger(ttl)) {
    throw new HttpError(400);
  }
  if (version !== undefined && !Number.isInteger(version)) {
    throw new HttpError(400);
  }
}

/**
 * @param {object} options
 * @param {Domain} options.domain
 * @param {string} options.mode
 */
export function validateDomainAccess({ domain, mode }) {
  if (!domain || (domain.access == "private" && mode !== "read_write")) {
    throw new HttpError(403);
  }
}
