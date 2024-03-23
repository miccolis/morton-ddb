/**
 * @param {boolean} isTestRun
 * @return {import('../types').Config}
 */
export const loadConfig = (isTestRun) => {
  if (isTestRun) {
    return {
      dynamodbTableName: "test",
      dynamodbClientConfig: {
        endpoint: "http://localhost:8000",
      },
      // import { generateSecret } from "jose";
      // (await generateSecret("HS257")).export().toString("hex");
      jwtSecret: new TextEncoder().encode(
        "931aeead46d069f4598e7b18d9dc95db3636e05357f814bce363f61b022862ba",
      ),
      appURI: "http://localhost:8080",
    };
  } else {
    const {
      DYNAMODB_TABLE_NAME: dynamodbTableName,
      DYNAMODB_ENDPOINT: dynamodbEndpoint,
      JWT_SECRET: jwtSecret,
      APP_URI: appURI,
    } = process.env;
    return {
      dynamodbTableName,
      dynamodbClientConfig: dynamodbEndpoint
        ? {
            endpoint: dynamodbEndpoint,
          }
        : undefined,
      jwtSecret: new TextEncoder().encode(jwtSecret),
      appURI,
    };
  }
};
