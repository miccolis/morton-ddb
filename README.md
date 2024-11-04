## Morton DDB

Stores & serves geospatial data using AWS DynamoDB and AWS Lambda. This is a
hobby project I'm using to revisit a few, mostly unrelated, ideas; z-order
indexed data in DynamoDB, Lambda function URLs, a middleware-less & minimal
dependency node.js server, Typescript type checking & vanilla Javascript, and
web components too.

I'm having to implement authentication as well because the AWS options for
Lambda URIs are limited. It should be noted that there are a few security
shortcuts I've taken related to authentication to keep things simple which also
mean this project shouldn't be used with sensitive data, or maybe at all.

## API

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

GET    /account - Get info about logged in user.
POST   /account - Create an account
PATCH  /account/<account-id> - Update an account

POST   /login
GET    /logout
```

## Web Interface

A basic web interface exists for managing domains & viewing data.

## Uploading Data

The API expects GeoJSON so you can use curl as follows

```
# Login and store the cookie locally
curl -c 🍪.txt  --data "username=<username>" --data "password="<password>" http://www.example.com/app/login

# Upload that data
curl -b 🍪.txt  --json @my-data http://www.example.com/app/d/<domain-id>/item
```

## Configuration

The Lambda hosted API expects the following configuration.

| Environment variable | Description                                                       | Example                 |
| -------------------- | ----------------------------------------------------------------- | ----------------------- |
| DYNAMODB_TABLE_NAME  | DynamoDB table name                                               | `my-table`              |
| DYNAMODB_ENDPOINT    | Overrides the default DynamoDB endpoint, useful for local testing | `http://localhost:8000` |
| JWT_SECRET           | Hex encoded HS256 secret.                                         |                         |

The Jekyll-built web front end also has config.

| \_config.yml variable | Description                    | Example                             |
| --------------------- | ------------------------------ | ----------------------------------- |
| mapboxAccessToken     | Public access token for Mapbox | `pk.but-like-my-actual.token-value` |

## Deployment

### Initialization

#### AWS Hosted API

For initial setup use the aws cli to provision the resources. Before you do that
an HS256 secret is needed to generate the JSON Web Tokens (JWTs) that are used
for authorization.

```
# Run in a node.js REPL
const { generateSecret } = (await import("jose")).
(await generateSecret("HS256")).export().toString("hex");
```

```
# Back in a shell
export STACK_NAME=morton-test

aws cloudformation deploy --template-file ./cloudformation/template.json \
--stack-name $STACK_NAME --no-execute-changeset --capabilities CAPABILITY_IAM \
--parameter-overrides JWTSecret=[HS256-STRING]

make code-update
```

#### AWS Hosted Web UI

Add a Mapbox public token to `./web/_config.yml`. Adding a line to the end of
the file like this;

```
mapboxAccessToken: "pk.but-like-my-actual.token-value"
```

With that in place, get the code up on S3

```
export STACK_NAME=morton-test
make web-update
```

#### First user account

To create the first user account you'll need to manually create the record in
DynamoDB. First create the password hash.

```
# In a node.js REPL
> const { default: bcryptjs } = await import("bcryptjs")
> await bcryptjs.hash('[MY-PASSWORD-HERE]', await bcryptjs.genSalt(10))
```

Then use the hash in a record like this, which can be added to DynamoDB in the
web console.

```
{
 "partition": "_accounts",
 "sort": "admin",
 "passwordHash": "[PASSWORD HASH]",
 "username": "admin",
 "version": 1
}
```

### Updates

Once that is setup you can use the Makefile for other updates

```
export STACK_NAME=morton-test
make stack-update
make code-update
make web-update
```

## Database Index Design

| Partition           | Sort          | IndexedDomain     | Morton    |
| ------------------- | ------------- | ----------------- | --------- |
| [domainId]          | item:[itemid] | n/a               | n/a       |
| [domainId]:[itemId] | [morton]      | [domainId]:[zoom] | [integer] |
| \_accounts          | [accountId]   | n/a               | n/a       |
| \_domains           | [domainId]    | n/a               | n/a       |

Indexed domain is a secondary partition with a Morton as a numeric sort key.
TODO These should have more generic names.

Related reading

- https://aws.amazon.com/blogs/database/z-order-indexing-for-multifaceted-queries-in-amazon-dynamodb-part-1/
- https://docs.mapbox.com/help/glossary/zoom-level/

## Development

https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html

### Prerequisites

Test suite assumes you've got Docker available so that it can run "DynamoDB Local". It will also attempt to use port 8000 for the same. Currently tests also assume that DynamodDB local is also running. See notes below...

### Running local

Quickest way to get running locally, run tests and then start the local server
in test mode;

```
npm test
IS_TEST_RUN=true node ./scripts/local.js
```

The front end can be started using jekyll.

```
cd web
bundler exec jekyll serve
```

A proxy exists in the local server sot that that API and Static resouces can all be accessed at localhost:8080

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
