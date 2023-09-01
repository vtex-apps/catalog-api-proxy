export async function warmup(ctx: Context,
  next: () => Promise<any>): Promise<any> {
    ctx.status = 200
    ctx.body = {success:1}
    await next()
}
