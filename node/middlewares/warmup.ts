export async function warmup(ctx: Context,
  next: () => Promise<any>): Promise<any> {

    const {
      clients: {
        salesChannelApi
      },
    } = ctx
    const header = {
      'Accept-Encoding': 'gzip',
      'User-Agent': process.env.VTEX_APP_ID
    }
    await salesChannelApi.getSalesChannel('1',header)
    await salesChannelApi.getSalesChannel('2',header)
    await salesChannelApi.getSalesChannel('3',header)
    await salesChannelApi.getSalesChannel('4',header)
    await salesChannelApi.getSalesChannel('5',header)
    await salesChannelApi.getSalesChannel('6',header)
    ctx.status = 200
    ctx.body = {success:1}
    await next()
}
