/**
 * @param {import('../types').PathHandlerOptions} options
 */
export const logoutHandler = async ({ config }) => {
  const expires = new Date(0).toUTCString();
  return {
    statusCode: 303,
    headers: {
      "content-type": "application/json",
      location: config.appURI,
    },
    cookies: [`auth=deleted; Path=/app/; expires=${expires}; HttpOnly;`],
  };
};
