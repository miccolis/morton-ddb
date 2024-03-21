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
        partition: "_domain",
        sort: domainId,
      },
    }),
  );
  if (item) {
    return {
      domainId: item.domainId,
      name: item.name,
      owners: item.owners,
      zoom: item.zoom,
      access: item.access ?? "private",
      ttl: item.ttl ?? 0,
      version: item.version,
      created: item.created,
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
  { name, access, zoom, ttl, version },
  allowPartial = false,
) {
  if (
    (!(name === undefined && allowPartial) && typeof name !== "string") ||
    name.length > 64 ||
    name[0] === "_"
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
  if (zoom !== undefined && !Number.isInteger(zoom) && zoom > 0 && zoom <= 24) {
    throw new HttpError(
      400,
      'Property "zoom" must be an integer value of 24 or less',
    );
  }
  if (ttl !== undefined && !Number.isInteger(ttl)) {
    throw new HttpError(400);
  }
  if (version !== undefined && !Number.isInteger(version)) {
    throw new HttpError(400, 'Property "version" must be an integer value');
  }
}

/**
 * @param {object} options
 * @param {Domain} options.domain
 * @param {string} options.username
 */
export function validateDomainAccess({ domain, username }) {
  if (
    domain.access == "private" &&
    username !== undefined &&
    !domain.owners.includes(username)
  ) {
    throw new HttpError(403);
  }
}
