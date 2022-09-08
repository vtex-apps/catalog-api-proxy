export function prepare (explicitlyAuthenticated: boolean) {
  return async function prepareMiddleware (ctx: Context, next: () => Promise<void>) {
    const { vtex: { account, logger, route, sessionToken }} = ctx
    let VtexIdclientAutCookie: string | undefined

    if (sessionToken) {
      const { session } = ctx.clients
      const sessionPayload = await session.getSession(sessionToken, ['*'])

      const isImpersonated = !!sessionPayload?.sessionData?.namespaces?.impersonate?.storeUserId?.value
      const vtexIdClientCookieName = isImpersonated ? 'VtexIdclientAutCookie' : `VtexIdclientAutCookie_${account}`
      VtexIdclientAutCookie = sessionPayload?.sessionData?.namespaces?.cookie?.[vtexIdClientCookieName]?.value
      if (!explicitlyAuthenticated && Math.floor(Math.random() * 100) === 0) {
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
    // todo: check if the sales channel is private instead of doing it
    // (depends on a new version of store session app, currently in beta)
    const isPageType = route.params.path.indexOf('/portal/pagetype/') !== -1
    if ((VtexIdclientAutCookie || explicitlyAuthenticated) && !isPageType) {
      ctx.vary('x-vtex-session')
    }

    ctx.state.userAuthToken = VtexIdclientAutCookie
    await next()
  }
}
