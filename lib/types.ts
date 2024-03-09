import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Feature, FeatureCollection } from "geojson";
import { APIGatewayProxyEventV2 } from "aws-lambda";

export type Config = {
  dynamodbTableName: string;
  dynamodbClientConfig: {
    endpoint: string;
  };
  jwtSecret: Uint8Array;
};

export type HttpMethod = "HEAD" | "GET" | "PUT" | "PATCH" | "POST" | "DELETE";

export type PathHandlerOptions = {
  params: Record<string, string>;
  event: APIGatewayProxyEventV2;
  ddbClient: DynamoDBDocumentClient;
  config: Config;
};

// From https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
export type Response =
  | {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
      cookies?: Array<string>;
      isBase64Encoded?: boolean;
    }
  | Omit<object, "statusCode">;

export type PathHandler = (PathHandlerOptions) => Response;

type DynamoDBItem = {
  partition: string;
  sort: string;
  model: string;
  version: number;
};

export type Account = {
  username: string;
  email: string;
  created: string;
  login?: string;
  version?: number;
  password?: string;
  passwordResetRequired?: boolean;
};

export type StoredAccount = DynamoDBItem &
  Account & {
    passwordHash?: string;
  };

export type Domain = {
  domainId?: string;
  name: string;
  access: "public" | "private";
  zoom: number;
  ttl?: number;
  version?: number;
  owners: string[];
};

export type StoredDomain = DynamoDBItem & Domain;

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
