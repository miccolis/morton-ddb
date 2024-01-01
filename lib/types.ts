import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Feature, FeatureCollection } from "geojson";

export type Config = {
  dynamodbTableName: string;
  dynamodbClientConfig: {
    endpoint: string;
  };
  mode: string;
};

export type HttpMethod = "HEAD" | "GET" | "PUT" | "PATCH" | "POST" | "DELETE";

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

export type Domain = {
  domainId?: string;
  name: string;
  access: "public" | "private";
  zoom: number;
  ttl?: number;
  version?: number;
};

export type Item = Feature & {
  itemId: string;
  domainId?: string;
  version?: number;
};

export type ItemCollection = FeatureCollection & {
  query: {
    domain?: string;
    bbox?: Array<number>;
  };
  features: Array<Item>;
};

// Typescript definition of UpdateCommandInpute is picky, but this satisfies
export type DynamoDBReturnValue =
  | "ALL_NEW"
  | "ALL_OLD"
  | "NONE"
  | "UPDATED_NEW"
  | "UPDATED_OLD";
