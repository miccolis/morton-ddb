export const logoutHandler = async () => {
  const expires = new Date(0).toUTCString();
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
    },
    cookies: [`auth=deleted; Path=/app/; expires=${expires}; HttpOnly;`],
  };
};
