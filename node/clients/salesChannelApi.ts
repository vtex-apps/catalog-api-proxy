import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

export class SalesChannelApi extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(`http://${context.workspace}--${context.account}.myvtex.com/`,context, {
      ...options,
      headers: {
        VtexIdClientAutCookie: context.authToken,
      },
    })
  }

  public async getSalesChannel(salesChannel: string){
    const abc = await this.http.get(
      `/api/catalog_system/pub/saleschannel/${salesChannel}`,
    )
    return abc

  }

}
