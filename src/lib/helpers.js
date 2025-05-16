import { jwtVerify, SignJWT } from "jose";

export class HttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {String} extra
   */
  constructor(statusCode, extra = "") {
    let message = "Unspecified Error";
    if (statusCode === 400) {
      message = "Bad Request";
    } else if (statusCode === 401) {
      message = "Unauthorized";
    } else if (statusCode === 403) {
      message = "Forbidden";
    } else if (statusCode === 404) {
      message = "Not Found";
    } else if (statusCode === 409) {
      message = "Conflict";
    } else if (statusCode === 415) {
      message = "Unsupported Media Type";
    } else if (statusCode === 500) {
      message = "Internal Server Error";
    }
    if (extra) {
      message = `${message} - ${extra}`;
    }
    super(message);
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      body: JSON.stringify({ message: this.message }),
      headers: {
        "content-type": "application/json",
      },
    };
  }
}

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 */
export const parseJSONRequest = (event) => {
  if (event.headers["content-type"]?.startsWith("application/json")) {
    return JSON.parse(event.body);
  } else {
    throw new HttpError(415);
  }
};

/**
 * Create a new object specified properties from the input object. Throws an
 * error if input object has extra keys.
 *
 * @param {Record<string, any>} body
 * @param {string[]} allowedKeys
 */
export function extractAllowedProperties(body, allowedKeys) {
  const updates = allowedKeys.reduce((m, key) => {
    if (key in body) m[key] = body[key];
    return m;
  }, {});

  if (Object.keys(body).length !== Object.keys(updates).length) {
    throw new HttpError(400, "Unsupported properties");
  }
  return updates;
}

/**
 * @param {import('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient} ddbClient
 * @param {import('@aws-sdk/lib-dynamodb').QueryCommand} query
 */
export async function dynamoDBQueryFetchAll(ddbClient, query) {
  let lastEvaluatedKey;
  let ret = [];
  do {
    const { Items, LastEvaluatedKey } = await ddbClient.send(query);
    ret = ret.concat(Items);
    lastEvaluatedKey = LastEvaluatedKey;
    query.input.ExclusiveStartKey = lastEvaluatedKey;
  } while (lastEvaluatedKey);
  return ret;
}

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 * @param {Uint8Array} jwtSecret
 */
export async function checkSession(event, jwtSecret) {
  if (!event.cookies) {
    throw new HttpError(403);
  }
  for (const cookie of event.cookies) {
    if (cookie.startsWith("auth=")) {
      const jwt = cookie.slice(5);
      try {
        const { payload } = await jwtVerify(jwt, jwtSecret);
        return payload;
      } catch (e) {
        if (
          e.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED" ||
          e.code === "ERR_JWS_INVALID"
        ) {
          throw new HttpError(403);
        } else {
          throw e;
        }
      }
    }
  }
  throw new HttpError(403);
}

export async function getCurrentUser(event, jwtSecret) {
  try {
    return (await checkSession(event, jwtSecret)).sub;
  } catch (e) {
    // In case of missing cookie, treat user as anonymous
    if (!(e instanceof HttpError && e.statusCode === 403)) {
      throw e;
    }
  }
  return undefined;
}

/**
 * @param {object} options
 * @param {string} options.username
 * @param {Uint8Array} options.jwtSecret
 * @param {number} options.maxage
 * @return {Promise<string>}
 */
export async function generateJWT({ username, jwtSecret, maxage }) {
  const alg = "HS256";

  const jwt = await new SignJWT()
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setSubject(username)
    .setExpirationTime(`${maxage}s`)
    .sign(jwtSecret);

  return jwt;
}
