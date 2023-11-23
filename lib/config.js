export const loadConfig = (isTestRun) => {
  if (isTestRun) {
    return {
      dynamodbTableName: "test",
      dynamodbClientConfig: {
        endpoint: "http://localhost:8000",
      },
      zooms: [12],
    };
  } else {
    const {
      DYNAMODB_TABLE_NAME: dynamodbTableName,
      DYNAMODB_ENDPOINT: dynamodbEndpoint,
      ZOOMS: zooms,
    } = process.env;
    return {
      dynamodbTableName,
      dynamodbClientConfig: {
        endpoint: dynamodbEndpoint,
      },
      zooms: zooms.split(",").map((v) => parseInt(v)),
    };
  }
};
