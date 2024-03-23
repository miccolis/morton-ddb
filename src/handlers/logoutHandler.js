/**
 * @param {import('../types').PathHandlerOptions} options
 */
export const logoutHandler = async ({ config }) => {
  return {
    statusCode: 303,
    headers: {
      "content-type": "application/json",
      location: config.appURI,
    },
    cookies: [`auth=; Max-Age=0; HttpOnly;`],
  };
};
