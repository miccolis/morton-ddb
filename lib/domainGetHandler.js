import { getDomain, validateDomainAccess } from "./domains.js";

/**
 * @param {import('./types').PathHandlerOptions} options
 */
export const domainGetHandler = async ({
  params: { domain: domainId },
  ddbClient,
  config,
}) => {
  const domain = await getDomain({ domainId, ddbClient, config });

  if (!domain) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Not Found" }),
      headers: {
        "content-type": "application/json",
      },
    };
  }

  const domainAccessError = validateDomainAccess({ domain, mode: config.mode });
  if (domainAccessError) {
    return domainAccessError;
  }

  return {
    domainId: domain.domainId,
    name: domain.name,
    version: domain.version,
  };
};
