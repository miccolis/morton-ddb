import { PutCommand } from "@aws-sdk/lib-dynamodb";

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

  // TODO what other fields?
  const { name } = JSON.parse(body);

  const item = {
    partition: domainId,
    sort: "domain",
    model: "domain",
    domainId,
    version: 1,
    name,
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
  };
};
