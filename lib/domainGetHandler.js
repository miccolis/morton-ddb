import { getDomain } from "./domains.js";

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const domainGetHandler = async ({
  params: { domain: domainId },
  ddbClient,
  config,
}) => {
  const item = await getDomain({ domainId, ddbClient, config });

  if (!item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Not Found" }),
      headers: {
        "content-type": "application/json",
      },
    };
  }

  return {
    domainId: item.domainId,
    name: item.name,
    version: item.version,
  };
};
