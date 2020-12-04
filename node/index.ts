import { prepare } from './middlewares/prepare'
import { request } from './middlewares/request'

process.env.DETERMINISTIC_VARY = 'true'

function compose(...middlewares: Array<(ctx: any, next: () => Promise<void>) => Promise<void>>): (ctx: any) => Promise<void> {
  if (middlewares.length === 0) {
    return () => Promise.resolve()
  }

  const next = compose(...middlewares.slice(1))
  return (ctx: any) => {
    return middlewares[0](ctx, () => next(ctx))
  }
}

export default {
  routes: {
    catalog: compose(prepare(false), request),
    authenticatedCatalog: compose(prepare(true), request),
  }
}
