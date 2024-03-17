import { compare } from "bcrypt";
import { getAccount } from "./accounts.js";
import { HttpError, generateJWT } from "./helpers.js";

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const authorizeHandler = async ({ event, ddbClient, config }) => {
  if (
    !event.headers["content-type"]?.startsWith(
      "application/x-www-form-urlencoded",
    )
  ) {
    throw new HttpError(415);
  }

  const payload = new URLSearchParams(event.body);
  const username = payload.get("username");
  const password = payload.get("password");

  if (!username || !password) {
    throw new HttpError(400);
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

  const jwt = await generateJWT(username, config.jwtSecret);

  return {
    statusCode: 303,
    headers: {
      "content-type": "application/json",
      location: config.appURI,
    },
    cookies: [
      `auth=${jwt}; Max-Age=21600 SameSite=Strict; Path=/; Secure; HttpOnly`,
    ],
  };
};
