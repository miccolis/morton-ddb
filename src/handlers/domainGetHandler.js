import { getDomain, validateDomainAccess } from "../lib/domains.js";
import { HttpError, getCurrentUser } from "../lib/helpers.js";

/**
 * @param {import('../types').PathHandlerOptions} options
 */
export const domainGetHandler = async ({
  params: { domain: domainId },
  event,
  ddbClient,
  config,
}) => {
  const domain = await getDomain({ domainId, ddbClient, config });

  if (!domain) {
    throw new HttpError(404);
  }

  const username = await getCurrentUser(event, config.jwtSecret);

  validateDomainAccess({ domain, username });

  return {
    domainId: domain.domainId,
    name: domain.name,
    version: domain.version,
    ttl: domain.ttl,
    access: domain.access,
  };
};
