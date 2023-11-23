import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export type Config = {
  dynamodbTableName: string;
  dynamodbClientConfig: {
    endpoint: string;
  };
  zooms: Array<number>;
};

export type PathHandlerOptions = {
  params: Record<string, string>;
  event: {
    requestContext: { body: string };
    queryStringParameters: Record<string, string>;
  };
  ddbClient: DynamoDBDocumentClient;
  config: Config;
};

// From https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
export type Response =
  | {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
      cookies?: Record<string, string>;
      isBase64Encoded?: boolean;
    }
  | Omit<object, "statusCode">;

export type PathHandler = (PathHandlerOptions) => Response;
