import axios, { AxiosInstance } from 'axios'
import parseCookie from 'cookie'
import { prop } from 'ramda'

const SESSION_COOKIE = 'vtex_session'

const routes = {
  base: '/api/sessions',
}

export class Session {
  private readonly http: AxiosInstance

  constructor(context: any) {
    const { account, authToken } = context
    const env =
      context.janusEnv === 'beta' ? 'beta' : 'stable'

    this.http = axios.create({
      baseURL: `http://portal.vtexcommerce${env}.com.br`,
      headers: {
        'Proxy-Authorization': authToken
      },
      params: {
        an: account
      }
    })
  }
  /**
   * Get the session data using the given token
   */
  public getSession = async (token: string, items: string[]) => {
    const {
      data: sessionData,
      headers: {
        'set-cookie': [setCookies],
      },
    } = await this.http.get(routes.base, ({
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `vtex_session=${token};`,
      },
      params: {
        items: items.join(','),
      },
    }))

    const parsedCookie = parseCookie.parse(setCookies)
    const sessionToken = prop(SESSION_COOKIE, parsedCookie)

    return {
      sessionData,
      sessionToken,
    }
  }

  /**
   * Update the public portion of this session
   */
  public updateSession = (key: string, value: any, items: string[], token: any) => {
    const data = { public: { [key]: { value } } }
    const metric = 'session-update'
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `vtex_session=${token};`,
      },
      metric,
      params: {
        items: items.join(','),
      }
    }

    return this.http.post(routes.base, data, config)
  }
}
