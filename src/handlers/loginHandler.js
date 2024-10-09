import bcrypt from "bcryptjs";
import { getAccount } from "../lib/accounts.js";
import { HttpError, generateJWT } from "../lib/helpers.js";

const { compare } = bcrypt;
/**
 * @param {import('../types').PathHandlerOptions} options
 */
export const loginHandler = async ({ event, ddbClient, config }) => {
  if (
    !event.headers["content-type"]?.startsWith(
      "application/x-www-form-urlencoded",
    )
  ) {
    throw new HttpError(415);
  }

  const payload = new URLSearchParams(event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body);

  const username = payload.get("username");
  const password = payload.get("password");

  if (!username || !password) {
    throw new HttpError(400, 'username and password are required');
  }

  const account = await getAccount({
    username,
    ddbClient,
    config,
  });

  if (!account) {
    throw new HttpError(404);
  }

  if (!(await compare(password, account.passwordHash))) {
    throw new HttpError(401);
  }

  // TODO log access time

  // 6 hours
  const maxage = 21600;

  const jwt = await generateJWT({
    username,
    jwtSecret: config.jwtSecret,
    maxage,
  });

  return {
    statusCode: 303,
    headers: {
      "content-type": "application/json",
      location: event.headers.origin ?? `http://${event.headers.host}`
    },
    cookies: [
      `auth=${jwt}; Max-Age=${maxage}; SameSite=Strict; Path=/app/; HttpOnly`,
    ],
  };
};
