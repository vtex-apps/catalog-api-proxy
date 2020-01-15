import { Functions } from '@gocommerce/utils'
import axios from 'axios'
import qs from 'qs'
import { keys, path as ramdaPath } from 'ramda'
import productSearchResponse from '../mocks/productSearch'
import facetsResp from '../mocks/facets'
import productResp from '../mocks/product'

const TIMEOUT_MS = 30 * 1000
const MAX_AGE_S = 5 * 60
const STALE_IF_ERROR_S = 1 * 60 * 60
const THIRTY_SECONDS = 30

const pathsWithTwoSegments = ['products', 'facets', 'portal']

// Section 13.5.1 https://www.ietf.org/rfc/rfc2616.txt
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]

const isHopByHopHeader = (header: string) => HOP_BY_HOP_HEADERS.includes(header.toLowerCase())

const finish = (ctx: any, status: number = 200, production: boolean, data: any) => {
  ctx.vary('x-vtex-segment')
  // The 206 from the catalog API is not spec compliant since it doesn't correspond to a Range header,
  // so we normalize it to a 200 in order to cache list results, which vary with query string parameters.
  ctx.status = status === 206 ? 200 : status
  ctx.set('cache-control', production ? `public, max-age=${MAX_AGE_S}, stale-while-revalidate=${THIRTY_SECONDS}, stale-if-error=${STALE_IF_ERROR_S}` : 'no-store, no-cache')
  ctx.body = data
}

export async function catalog(ctx: Context) {
  const { vtex: { account, authToken, operationId, production, route, segmentToken, sessionToken }, query, method } = ctx
  let VtexIdclientAutCookie: string | undefined
  const path = route.params.path as string
  console.log('teste START with: ', path, ' user agent ', ctx.request.headers['user-agent'])
  if (path.startsWith('pub/products/search') && path.indexOf('map=') >= 0) {
    // ctx.body = productSearchResponse
    finish(ctx, 200, production, productSearchResponse)
    return

    // return productSearchResponse
  }
  if (path.startsWith('pub/facets/search')) {
    finish(ctx, 200, production, facetsResp)
    return
    // return facetsResp // mock de facets
  }
  if (path.startsWith('pub/products/search')) {
    finish(ctx, 200, production, productResp)
    return
    // return productResp // mock de produto
  }
  // if (path.startsWith('/pub/portal/pagetype')) {
  //   // return pagetype de categoria
  // }
  if (path.startsWith('pub/category/tree')) {
    finish(ctx, 200, production, {})
    return
  }
  console.log('teste going with: ', path)

  if (sessionToken) {
    const { session } = ctx.clients
    const sessionPayload = await session.getSession(sessionToken, ['*'])
    VtexIdclientAutCookie = ramdaPath(['sessionData', 'namespaces', 'cookie', `VtexIdclientAutCookie_${account}`, 'value'], sessionPayload)
  }

  const isGoCommerce = Functions.isGoCommerceAcc(ctx)

  // The `portal-search` API has an incorrect endpoint /buscaautocomplete on root.
  const isAutoComplete = path.startsWith('buscaautocomplete')

  const [host, basePath] = isGoCommerce
    ? ['api.gocommerce.com', `${account}/search`]
    : ['portal.vtexcommercestable.com.br', isAutoComplete ? '' : 'api/catalog_system']

  const cookie = segmentToken && { Cookie: `vtex_segment=${segmentToken}` }
  const params = {
    ...query,
    an: account,
  }

  const start = process.hrtime()

  const { data, headers, status } = await axios.request({
    baseURL: `http://${host}/${basePath}`,
    headers: {
      'Accept-Encoding': 'gzip',
      'Proxy-Authorization': authToken,
      'User-Agent': process.env.VTEX_APP_ID,
      ...VtexIdclientAutCookie ? { VtexIdclientAutCookie } : null,
      ...operationId ? { 'x-vtex-operation-id': operationId } : null,
      ...cookie,
    },
    method: isGoCommerce ? 'GET' : method,
    params,
    paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
    timeout: TIMEOUT_MS,
    url: encodeURI((path as any).trim()),
    validateStatus: (responseStatus: number) => 200 <= responseStatus && responseStatus < 500
  })

  try {
    const diff = process.hrtime(start)
    let metricName = ''

    if (isAutoComplete) {
      metricName = 'cap-autocomplete'
    }
    else {
      const pathWithoutPub = path.replace('pub/', '')
      const [segment1, segment2] = pathWithoutPub.split('/')
      metricName = pathsWithTwoSegments.includes(segment1) ? `cap-${segment1}-${segment2}` : `cap-${segment1}`
    }

    const extensions = {
      'api-cache-expired': headers['x-vtex-cache-status-janus-apicache'] === 'EXPIRED' ? 1 : 0,
      'api-cache-hit': headers['x-vtex-cache-status-janus-apicache'] === 'HIT' ? 1 : 0,
      'api-cache-miss': headers['x-vtex-cache-status-janus-apicache'] === 'MISS' ? 1 : 0,
    }

    metrics.batch(metricName, diff, extensions)
  } catch (e) {
    ctx.vtex.logger.error(e)
  }

  keys(headers).forEach(headerKey => {
    if (isHopByHopHeader(headerKey)) {
      return
    }
    ctx.set(headerKey, headers[headerKey])
  })

  ctx.vary('x-vtex-segment')
  // The 206 from the catalog API is not spec compliant since it doesn't correspond to a Range header,
  // so we normalize it to a 200 in order to cache list results, which vary with query string parameters.
  ctx.status = status === 206 ? 200 : status
  ctx.set('cache-control', production ? `public, max-age=${MAX_AGE_S}, stale-while-revalidate=${THIRTY_SECONDS}, stale-if-error=${STALE_IF_ERROR_S}` : 'no-store, no-cache')
  ctx.body = data
}
