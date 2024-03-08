import { getAccount } from "./accounts.js";
import { HttpError, checkSession } from "./helpers.js";

/**
 * @typedef {import('./types').Account} Account
 */

/**
 * @param {import('./types').PathHandlerOptions} options
 * @return {Promise<Account>}
 */
export const accountGetHandler = async ({
  params: { account: username },
  event,
  ddbClient,
  config,
}) => {
  checkSession(event, config.jwtSecret)

  const { email, created, login } = await getAccount({ username, ddbClient, config });

  if (!created) {
    throw new HttpError(404);
  }

  return {
    username, email, created, login
  };
};
