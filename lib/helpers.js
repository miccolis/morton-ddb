export class HttpError extends Error {
  /**
   * @param {number} statusCode
   */
  constructor(statusCode) {
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
