import { QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import booleanDisjoint from "@turf/boolean-disjoint";
import { coordsToMorton } from "./geoIndex.js";
import { getDomain, validateDomainAccess } from "./domains.js";

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const itemQueryHandler = async ({
  params: { domain: domainId },
  ddbClient,
  event: { queryStringParameters },
  config: { dynamodbTableName, zooms, mode },
}) => {
  const domain = await getDomain({
    domainId,
    ddbClient,
    config: { dynamodbTableName },
  });
  const domainAccessError = validateDomainAccess({ domain, mode });
  if (domainAccessError) {
    return domainAccessError;
  }

  // TODO validate bbox
  const bbox = queryStringParameters.bbox?.split(",").map((v) => parseFloat(v));
  const bboxGeom = {
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

  // TODO generate multiple queries that omit large gaps in the morton range

  const z = zooms[0]; // TODO support more than one level of indexing
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
        if (!booleanDisjoint(bboxGeom, item)) items.push(item);
      }
    }
  }

  return {
    query: {
      domain: domainId,
      bbox,
    },
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
