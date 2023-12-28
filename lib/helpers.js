export class HttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {String} extra
   */
  constructor(statusCode, extra = "") {
    let message = "Unspecified Error";
    if (statusCode === 400) {
      message = "Bad Request";
    } else if (statusCode === 403) {
      message = "Forbidden";
    } else if (statusCode === 404) {
      message = "Not Found";
    } else if (statusCode === 409) {
      message = "Conflict";
    } else if (statusCode === 500) {
      message = "Internal Server Error";
    }
    if (extra) {
      message = `${message} - ${extra}`;
    }
    super(message);
    this.statusCode = statusCode;
  }

  value() {
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
 * @param {string} body
 * @param {string[]} allowedKeys
 */
export function extractAllowedProperties(body, allowedKeys) {
  const parsedBody = JSON.parse(body);

  const updates = allowedKeys.reduce((m, key) => {
    if (key in parsedBody) m[key] = parsedBody[key];
    return m;
  }, {});

  if (Object.keys(parsedBody).length !== Object.keys(updates).length) {
    throw new HttpError(400);
  }
  return updates;
}
