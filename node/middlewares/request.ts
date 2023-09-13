import { Functions } from '@gocommerce/utils'
import axios from 'axios'
import qs from 'qs'
import { getAppSettings } from '../utils/getAppSettings'
const TIMEOUT_MS = 30 * 1000
const MAX_AGE_S = 5 * 60
const STALE_IF_ERROR_S = 1 * 60 * 60
const STALE_WHILE_REVALIDATE_S = 1 * 60 * 60

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

function isNumber(n:any) { return /^-?[\d.]+(?:e-?\d+)?$/.test(n); }

export async function request(ctx: Context, next: () => Promise<void>) {
  const { state: {userAuthToken, isImpersonated, explicitlyAuthenticated}, vtex: { account, authToken, operationId, production, route, segmentToken }, query, method } = ctx
  const path = route.params.path as string

  if(path.includes("pub/saleschannel/")){
    const {
      clients: {
        salesChannelApi
      },
    } = ctx

    try {
      //console.log("request Sales Chanannel")
      const salesChannelResponse = await salesChannelApi.getSalesChannel(path.toString().slice(-1))
      ctx.body = salesChannelResponse
      ctx.status = 200

    } catch (e) {
      ctx.status = 500
      //console.log(e.message)
      ctx.body = e
      ctx.vtex.logger.error(e)
    }
    ctx.set('cache-control', production ? `public, max-age=${MAX_AGE_S}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_S}, stale-if-error=${STALE_IF_ERROR_S}` : 'no-store, no-cache')
    await next()
  }else{
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

    //console.log(params)

    var hdr: any = {
      'Accept-Encoding': 'gzip',
      'Proxy-Authorization': authToken,
      'User-Agent': process.env.VTEX_APP_ID,
      ...userAuthToken ? { VtexIdclientAutCookie: userAuthToken } : null,
      ...operationId ? { 'x-vtex-operation-id': operationId } : null,
      ...cookie,
    }
    var forceSc = false
    if(isImpersonated){
      const { appKey, appToken } = await getAppSettings(ctx)
      if (!appKey || !appToken) {
        forceSc = true
      }else{
       // console.log("new Header")
        hdr = {
          'Accept-Encoding': 'gzip',
          'Proxy-Authorization': authToken,
          'User-Agent': process.env.VTEX_APP_ID,
          'X-VTEX-API-AppKey': appKey,
          'X-VTEX-API-AppToken': appToken,
          ...operationId ? { 'x-vtex-operation-id': operationId } : null,
          ...cookie,
        }
      }

    }
    //(params)
    //console.log("forceSc",forceSc)
    //console.log("explicitlyAuthenticated", explicitlyAuthenticated)

    if(!explicitlyAuthenticated || forceSc || (path.includes("pub/specification/field") && params?.sc)){
      if(params.sc){
        if(!isNumber(params.sc)){
          if(params.sc[0]){
            params.sc = params.sc[0]
          }
        }
        if(params.sc == '2' || params.sc == '5' || params.sc == '6'){
          const { appKey, appToken } = await getAppSettings(ctx)
          //console.log("new Header private sc")
          hdr = {
            'Accept-Encoding': 'gzip',
            'Proxy-Authorization': authToken,
            'User-Agent': process.env.VTEX_APP_ID,
            'X-VTEX-API-AppKey': appKey,
            'X-VTEX-API-AppToken': appToken,
            ...operationId ? { 'x-vtex-operation-id': operationId } : null,
            ...cookie,
          }

        }
      }
    }
    //console.log("new params",params)
    const start = process.hrtime()

    const { data, headers, status } = await axios.request({
      baseURL: `http://${host}/${basePath}`,
      headers: hdr,
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

    Object.keys(headers).forEach(headerKey => {
      if (isHopByHopHeader(headerKey)) {
        return
      }

      if (headerKey === 'vary') {
        return
      }

      ctx.set(headerKey, headers[headerKey])
    })

    // The 206 from the catalog API is not spec compliant since it doesn't correspond to a Range header,
    // so we normalize it to a 200 in order to cache list results, which vary with query string parameters.
    ctx.status = status === 206 ? 200 : status
    ctx.set('cache-control', production ? `public, max-age=${MAX_AGE_S}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_S}, stale-if-error=${STALE_IF_ERROR_S}` : 'no-store, no-cache')
    ctx.body = data
    await next()

  }

}
