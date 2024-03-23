import { QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import booleanDisjoint from "@turf/boolean-disjoint";
import buffer from "@turf/buffer";

import { HttpError, getCurrentUser } from "../lib/helpers.js";
import { coordsToMorton } from "../lib/geoIndex.js";
import { getDomain, validateDomainAccess } from "../lib/domains.js";

/**
 * @typedef {import('geojson').Geometry} Geometry
 */

/**
 * @param {Array<number>} point
 */
export function validatePoint(point) {
  if (point.length !== 2) {
    throw new HttpError(400);
  }
  const [x, y] = point;
  if (
    typeof x === "number" &&
    typeof y === "number" &&
    x >= -180 &&
    x <= 180 &&
    y >= -90 &&
    y <= 90
  ) {
    return true;
  }
  throw new HttpError(400);
}

/**
 * @param {Array<number>} bbox
 */
export function validateBoundingBox(bbox) {
  if (bbox.length !== 4) {
    throw new HttpError(400);
  }

  validatePoint(bbox.slice(0, 2));
  validatePoint(bbox.slice(2, 4));
  if (bbox[0] > bbox[2] || bbox[1] > bbox[3]) {
    throw new HttpError(400);
  }
}

/**
 * @param {Record<string, string>} query
 */
export function generateFilterGeoms(query) {
  if (query.bbox) {
    const bbox = query.bbox.split(",", 4).map((v) => parseFloat(v));

    validateBoundingBox(bbox);

    /** @type {Geometry} */
    const filterGeom = {
      type: "Polygon",
      coordinates: [
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[1]],
          [bbox[2], bbox[3]],
          [bbox[0], bbox[3]],
          [bbox[0], bbox[1]],
        ],
      ],
    };
    return {
      bbox,
      filterGeom,
    };
  } else if (query.point) {
    const point = query.point.split(",", 2).map((v) => parseFloat(v));
    validatePoint(point);

    /** @type {Geometry} */
    const pointGeom = {
      type: "Point",
      coordinates: point,
    };

    // This will always be a Polygon with no holes.
    const filterGeom = buffer(pointGeom, 0.5, { units: "kilometers" });

    const lastIdx = filterGeom.geometry.coordinates[0].length - 1;

    const xArr = filterGeom.geometry.coordinates[0].map((v) => v[0]);
    xArr.sort((a, b) => a - b);

    const yArr = filterGeom.geometry.coordinates[0].map((v) => v[1]);
    yArr.sort((a, b) => a - b);

    const bbox = [xArr[0], yArr[0], xArr[lastIdx], yArr[lastIdx]];

    return {
      bbox,
      filterGeom,
    };
  }
}

/**
 * @param {import('../types').PathHandlerOptions} options
 * @return {Promise<import('../types').ItemCollection>}
 */
export const itemQueryHandler = async ({
  params: { domain: domainId },
  ddbClient,
  event,
  config,
}) => {
  const { queryStringParameters } = event;
  const domain = await getDomain({
    domainId,
    ddbClient,
    config,
  });

  const { dynamodbTableName, jwtSecret } = config;

  const username = await getCurrentUser(event, jwtSecret);
  validateDomainAccess({ domain, username });

  const { bbox, filterGeom } = generateFilterGeoms(queryStringParameters);

  // TODO generate multiple queries that omit large gaps in the morton range

  const z = domain.zoom;
  const topLeft = coordsToMorton(z, { x: bbox[0], y: bbox[3] });
  const bottomRight = coordsToMorton(z, { x: bbox[2], y: bbox[1] });

  let { Items: hits } = await ddbClient.send(
    new QueryCommand({
      TableName: dynamodbTableName,
      IndexName: "QueryByZoom",
      KeyConditionExpression:
        "#indexedDomain= :indexedDomain AND #morton between :min AND :max",
      FilterExpression:
        "x >= :minX AND x <= :maxX AND y >= :minY AND y <= :maxY",
      ProjectionExpression: "itemId",
      ExpressionAttributeNames: {
        "#indexedDomain": "indexedDomain",
        "#morton": "morton",
      },
      ExpressionAttributeValues: {
        ":indexedDomain": `${domainId}:${z}`,
        ":min": topLeft.morton,
        ":max": bottomRight.morton,
        ":minX": topLeft.x,
        ":maxX": bottomRight.x,
        ":minY": topLeft.y,
        ":maxY": bottomRight.y,
      },
    }),
  );

  const itemIds = new Set(hits.map((v) => v.itemId));

  let items = [];
  if (itemIds.size > 0) {
    for (let i = 0; i < itemIds.size; i += 25) {
      /** @type {Record<string, { Keys: Array<Record<string, string>>} >} */
      const requestItems = {};
      requestItems[dynamodbTableName] = {
        Keys: Array.from(itemIds)
          .slice(i, i + 25)
          .map((v) => ({
            partition: domainId,
            sort: `item:${v}`,
          })),
      };

      const { Responses: results } = await ddbClient.send(
        new BatchGetCommand({
          RequestItems: requestItems,
        }),
      );

      for (const item of results[dynamodbTableName]) {
        // @ts-ignore-next-line - item will be a feature
        if (!booleanDisjoint(filterGeom, item)) items.push(item);
      }
    }
  }

  const query = {
    domain: domainId,
  };
  if (queryStringParameters.bbox) query.bbox = queryStringParameters.bbox;
  else if (queryStringParameters.point)
    query.point = queryStringParameters.point;

  return {
    query,
    type: "FeatureCollection",
    features: items.map(
      ({
        domainId,
        itemId,
        version,
        type,
        properties,
        geometry,
        features,
      }) => ({
        domainId,
        itemId,
        version,
        type,
        properties,
        geometry,
        features,
      }),
    ),
  };
};
