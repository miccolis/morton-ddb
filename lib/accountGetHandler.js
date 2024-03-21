import { getAccount } from "./accounts.js";
import { HttpError, checkSession } from "./helpers.js";

/**
 * @typedef {import('./types').Account} Account
 */

/**
 * @param {import('./types').PathHandlerOptions} options
 * @return {Promise<Account>}
 */
export const accountGetHandler = async ({ event, ddbClient, config }) => {
  const { sub: username } = await checkSession(event, config.jwtSecret);

  const account = await getAccount({
    username,
    ddbClient,
    config,
  });

  if (!account) {
    throw new HttpError(404);
  }

  const { email, created, login } = account;

  return {
    username,
    email,
    created,
    login,
  };
};
