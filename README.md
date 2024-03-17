## Morton DDB

```
GET    /domains - List domains
GET    /d/<domain-id> - Get a domain
PUT    /d/<domain-id> - Create a domain
PATCH  /d/<domain-id> - Update a domain

GET    /d/<domain-id>/items - Returns all features
POST   /d/<domain-id>/item - Create a new feature

GET    /d/<domain-id>/item/<item-uuid> - Get a single feature
PATCH  /d/<domain-id>/item/<item-uuid> - Update a single feature
DELETE /d/<domain-id>/item/<item-uuid> - Delete a single feature

GET    /d/<domain-id>/query?bbox=<minx>,<miny>,<maxx>,<maxy> - Query for features in a bounding box
GET    /d/<domain-id>/query?point=<x>,<y> - Query for features near a point

GET    /account - Not implemented
POST   /account - Create an account
PATCH  /account/<account-id> - Update an account

POST   /authorize
```

## Configuration

| Environment variable | Description                                                       | Example                 |
| -------------------- | ----------------------------------------------------------------- | ----------------------- |
| DYNAMODB_TABLE_NAME  | DynamoDB table name                                               | `my-table`              |
| DYNAMODB_ENDPOINT    | Overrides the default DynamoDB endpoint, useful for local testing | `http://localhost:8000` |
| JWT_SECRET           | Hex encoded HS257 secret.                                         |                         |
| APP_URI              | Base URI for the web application                                  | `http://localhost:8080` |

## Indexing

https://docs.mapbox.com/help/glossary/zoom-level/

Related reading https://aws.amazon.com/blogs/database/z-order-indexing-for-multifaceted-queries-in-amazon-dynamodb-part-1/

## Development

https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html

Quickest way to get running locally, run tests and then start the local server
in test mode;

```
npm test
IS_TEST_RUN=true node ./scripts/local.js
```

The front end is can be started using jekyll

```
cd web
bundler exec jekyll serve
```

## Deployment

```
export STACK_NAME=morton-test
aws cloudformation deploy --template-file ./cloudformation/template.json --stack-name $STACK_NAME --no-execute-changeset --capabilities CAPABILITY_IAM

export STACK_NAME=morton-test
export FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`PublicReadLambdaArn`].OutputValue' --output text)

aws lambda update-function-code --function-name $FUNCTION_ARN --zip-file fileb://dist/bundle.zip
```

## Tests

### Prerequisites

Test suite assumes you've got Docker available so that it can run "DynamoDB Local". It will also attempt to use port 8000 for the same. Currently tests also assume that DynamodDB local is also running. See notes below...

#### Notes on avoiding Docker Desktop

If you're on newer, non-intel, Mac you may want to use `lima` to manage a VM for Docker. After installing w/ brew that looks something like:

```
limactl start template://docker
docker context create lima-docker --docker "host=unix:///Users/<myusername>/.lima/docker/sock/docker.sock"
docker context use lima-docker
```

#### Notes on DynamoDB Local

```
docker run -d --rm -p 8000:8000 amazon/dynamodb-local:latest \
  -jar DynamoDBLocal.jar \
  -disableTelemetry \
  -inMemory  \
  -sharedDb
```

`aws --endpoint-url http://localhost:8000 dynamodb scan --table-name test`
