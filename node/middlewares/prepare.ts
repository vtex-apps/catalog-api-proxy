export function prepare (explicitlyAuthenticated: boolean) {
  return async function prepareMiddleware (ctx: Context, next: () => Promise<void>) {
    const { vtex: { account, logger, sessionToken }} = ctx
    let VtexIdclientAutCookie: string | undefined

    if (sessionToken) {
      const { session } = ctx.clients
      const sessionPayload = await session.getSession(sessionToken, ['*'])

      const isImpersonated = !!sessionPayload?.sessionData?.namespaces?.impersonate?.storeUserId?.value
      const vtexIdClientCookieName = isImpersonated ? 'VtexIdclientAutCookie' : `VtexIdclientAutCookie_${account}`
      VtexIdclientAutCookie = sessionPayload?.sessionData?.namespaces?.cookie?.[vtexIdClientCookieName]?.value
      if (!explicitlyAuthenticated) {
        logger.warn({
          message: 'Using catalog instead of authenticatedCatalog for user authenticated search',
          path: ctx.path,
          query: ctx.query,
          userAgent: ctx.get('user-agent'),
          authenticated: !!VtexIdclientAutCookie
        })
      }
    }

    ctx.vary('x-vtex-segment')
    if (VtexIdclientAutCookie || explicitlyAuthenticated) {
      ctx.vary('x-vtex-session')
    }

    ctx.state.userAuthToken = VtexIdclientAutCookie
    await next()
  }
}
