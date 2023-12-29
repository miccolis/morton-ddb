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
      mode: "read_write",
      zooms: [12], // TODO move zoom to domain
    };
  } else {
    const {
      DYNAMODB_TABLE_NAME: dynamodbTableName,
      DYNAMODB_ENDPOINT: dynamodbEndpoint,
      MODE: mode,
      ZOOMS: zooms,
    } = process.env;
    return {
      dynamodbTableName,
      dynamodbClientConfig: {
        endpoint: dynamodbEndpoint,
      },
      mode,
      zooms: zooms.split(",").map((v) => parseInt(v)),
    };
  }
};
