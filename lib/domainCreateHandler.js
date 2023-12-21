import { PutCommand } from "@aws-sdk/lib-dynamodb";

export function validateDomain({ name, access, ttl }) {
  if (typeof name !== "string" || name.length > 64) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request" }),
      headers: {
        "content-type": "application/json",
      },
    };
  }
  if (access !== undefined && access !== "public" && access !== "private") {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request" }),
      headers: {
        "content-type": "application/json",
      },
    };
  }
  if (ttl !== undefined && !Number.isInteger(ttl)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request" }),
      headers: {
        "content-type": "application/json",
      },
    };
  }
  return false;
}

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const domainCreateHandler = async ({
  params: { domain: domainId },
  event: {
    requestContext: { body },
  },
  ddbClient,
  config: { dynamodbTableName },
}) => {
  // TODO access control

  const { name, access, ttl } = JSON.parse(body);

  const validationError = validateDomain({ name, access, ttl });
  if (validationError) {
    return validationError;
  }

  const item = {
    partition: domainId,
    sort: "domain",
    model: "domain",
    domainId,
    version: 1,
    name,
    access,
    ttl,
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
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Conflict" }),
        headers: {
          "content-type": "application/json",
        },
      };
    } else {
      throw e;
    }
  }

  return {
    domainId,
    name,
    version: 1,
    access,
    ttl,
  };
};
