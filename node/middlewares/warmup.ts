export async function warmup(ctx: Context,
  next: () => Promise<any>): Promise<any> {

    const {
      clients: {
        salesChannelApi
      },
    } = ctx
    await salesChannelApi.getSalesChannel('1')
    await salesChannelApi.getSalesChannel('2')
    await salesChannelApi.getSalesChannel('3')
    await salesChannelApi.getSalesChannel('4')
    await salesChannelApi.getSalesChannel('5')
    await salesChannelApi.getSalesChannel('6')
    ctx.status = 200
    ctx.body = {success:1}
    await next()
}
