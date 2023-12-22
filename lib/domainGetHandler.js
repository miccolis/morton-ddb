import { getDomain, validateDomainAccess } from "./domains.js";
import { HttpError } from "./helpers.js";

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
    throw new HttpError(404);
  }

  validateDomainAccess({ domain, mode: config.mode });

  return {
    domainId: domain.domainId,
    name: domain.name,
    version: domain.version,
  };
};
