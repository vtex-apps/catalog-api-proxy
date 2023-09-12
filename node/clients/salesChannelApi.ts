import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

export class SalesChannelApi extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(`http://portal.vtexcommercestable.com.br/`,context, {
      ...options,
      headers: {
        VtexIdClientAutCookie: context.authToken,
      },
    })
  }

  public async getSalesChannel(salesChannel: string){
    return await this.http.get(
      `/api/catalog_system/pub/saleschannel/${salesChannel}?an=beautycounterqa`,
    )
  }

}
