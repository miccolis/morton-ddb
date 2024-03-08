/**
 * @param {boolean} isTestRun
 * @return {import('./types').Config}
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
      mode: "read_write",
    };
  } else {
    const {
      DYNAMODB_TABLE_NAME: dynamodbTableName,
      DYNAMODB_ENDPOINT: dynamodbEndpoint,
      JWT_SECRET: jwtSecret,
      MODE: mode,
    } = process.env;
    return {
      dynamodbTableName,
      dynamodbClientConfig: {
        endpoint: dynamodbEndpoint,
      },
      jwtSecret: new TextEncoder().encode(jwtSecret),
      mode,
    };
  }
};
