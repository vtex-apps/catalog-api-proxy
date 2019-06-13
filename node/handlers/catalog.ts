import { Functions } from '@gocommerce/utils'
import axios from 'axios'
import qs from 'qs'
import { keys, path as ramdaPath } from 'ramda'

const TIMEOUT_MS = 7 * 1000
const MAX_AGE_S = 2 * 60
const STALE_IF_ERROR_S = 20 * 60

export const catalog = async (ctx: Context) => {
  const {vtex: {account, authToken, operationId, production, route: {params: {path}}, segmentToken, sessionToken}, query, method} = ctx
  let VtexIdclientAutCookie: string | undefined

  if (sessionToken) {
    const { session } = ctx.clients
    const sessionPayload = await session.getSession(sessionToken, [])
    VtexIdclientAutCookie = ramdaPath(['namespaces', 'cookie', `VtexIdclientAutCookie_${account}`], sessionPayload)
  }
  console.log(`VtexIdclientAutCookie: ${VtexIdclientAutCookie}`)

  const isGoCommerce = Functions.isGoCommerceAcc(ctx)

  // The `portal-search` API has an incorrect endpoint /buscaautocomplete on root.
  const isAutoComplete = (path as string).startsWith('buscaautocomplete')

  const [host, basePath] = isGoCommerce
    ? ['api.gocommerce.com', `${account}/search`]
    : ['portal.vtexcommercestable.com.br', isAutoComplete ? '' : 'api/catalog_system']

  const cookie = segmentToken && {Cookie: `vtex_segment=${segmentToken}`}
  const params = {
    ...query,
    an: account,
    segment: segmentToken,
  }

  const {data, headers, status} = await axios.request({
    baseURL: `http://${host}/${basePath}`,
    headers: {
      'Authorization': authToken,
      'Proxy-Authorization': authToken,
      'User-Agent': process.env.VTEX_APP_ID,
      ...VtexIdclientAutCookie ? { VtexIdclientAutCookie } : null,
      ... operationId ? {'x-vtex-operation-id': operationId} : null,
      ...cookie,
    },
    method: isGoCommerce ? 'GET' : method,
    params,
    paramsSerializer: (p) => qs.stringify(p, {arrayFormat: 'repeat'}),
    timeout: TIMEOUT_MS,
    url: encodeURI((path as any).trim()),
  })

  keys(headers).forEach(headerKey => {
    ctx.set(headerKey, headers[headerKey])
  })

  ctx.vary('x-vtex-segment')
  // The 206 from the catalog API is not spec compliant since it doesn't correspond to a Range header,
  // so we normalize it to a 200 in order to cache list results, which vary with query string parameters.
  ctx.status = status === 206 ? 200 : status
  ctx.set('cache-control', production ? `public, max-age=${MAX_AGE_S}, stale-if-error=${STALE_IF_ERROR_S}` : 'no-store, no-cache')
  ctx.body = data
}
