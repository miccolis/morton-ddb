import { readFile } from "fs/promises";
import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

async function before() {
  const schema = JSON.parse(
    await readFile(new URL("../schema/dynamodb.json", import.meta.url), "utf8"),
  );

  schema.TableName = "test";
  schema.ProvisionedThroughput = {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  };
  schema.GlobalSecondaryIndexes[0].ProvisionedThroughput = {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  };

  const client = new DynamoDBClient({ endpoint: "http://localhost:8000" });
  await client.send(new CreateTableCommand(schema));
}

async function cleanUp() {
  const client = new DynamoDBClient({ endpoint: "http://localhost:8000" });

  try {
    await client.send(new DescribeTableCommand({ TableName: "test" }));
  } catch (err) {
    if (err.name === "ResourceNotFoundException") return;
    throw err;
  }

  await client.send(new DeleteTableCommand({ TableName: "test" }));
}

// TODO use loadConfig
await cleanUp();
await before();
