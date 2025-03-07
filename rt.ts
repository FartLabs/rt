import type { Route } from "@std/http/unstable-route";
import { route } from "@std/http/unstable-route";

export type { Route };

export type HandleRequest = (
  request: Parameters<Route["handler"]>[0],
  params: Parameters<Route["handler"]>[1],
  info: Parameters<Route["handler"]>[2],
  // next: () => Promise<Response>,
  // state: TState
) => Response | Promise<Response>;

export type HandleDefault = () => Response | Promise<Response>;

export type HandleError = (error: Error) => Response | Promise<Response>;

function handleDefault() {
  return new Response("Not found", { status: 404 });
}

function handleError(error: Error) {
  return new Response(error.message, { status: 500 });
}

/**
 * Router is an HTTP router based on the `URLPattern` API.
 */
export class Router<TState> {
  public defaultState?: () => TState;

  public constructor(
    public routes: Route[] = [],
    public handleDefault?: HandleDefault,
    public handleError?: HandleError,
  ) {}

  /**
   * fetch invokes the router for the given request.
   */
  public async fetch(request: Request): Promise<Response> {
    try {
      return await this.execute(0, request);
    } catch (error) {
      if (error instanceof Error) {
        return await (this.handleError ?? handleError)(error);
      }

      throw error;
    }
  }

  /**
   * execute executes a route at the given index.
   */
  private execute(
    i: number,
    request: Parameters<HandleRequest>[0],
    info?: Parameters<HandleRequest>[2],
  ): Response | Promise<Response> {
    if (i >= this.routes.length) {
      return (this.handleDefault ?? handleDefault)();
    }

    const next = () => this.execute(i + 1, request, info);
    const handle = route(
      [{
        ...this.routes[i],
        handler: (request, params, info) => {
          return this.routes[i].handler(request, params, info); // , state, next);
        },
      }],
      next,
    );

    return handle(request, info);
  }

  /**
   * state sets the initial state of the router.
   */
  public state(defaultState: () => TState): this {
    this.defaultState = defaultState;
    return this;
  }

  /**
   * with appends a route to the router.
   */
  public with(route: Route): this {
    this.routes.push(route);
    return this;
  }

  /**
   * use appends a sequence of routers to the router.
   */
  public use(data: Route[] | Router<TState>): this {
    if (data instanceof Router) {
      this.routes.push(...data.routes);
    } else {
      this.routes.push(...data);
    }

    return this;
  }

  /**
   * default sets the router's default handler.
   */
  public default(handle: () => Response | Promise<Response>): this {
    this.handleDefault = handle;
    return this;
  }

  /**
   * error sets the router's error handler.
   */
  public error(handle: (error: Error) => Response | Promise<Response>): this {
    this.handleError = handle;
    return this;
  }

  /**
   * connect appends a router for the CONNECT method to the router.
   */
  public connect(
    pattern: string,
    handle: HandleRequest,
  ): this {
    return this.with({
      method: "CONNECT",
      pattern: new URLPattern({ pathname: pattern }),
      handler: handle,
    });
  }

  /**
   * delete appends a router for the DELETE method to the router.
   */
  public delete(
    pattern: string,
    handle: HandleRequest,
  ): this {
    return this.with({
      method: "DELETE",
      pattern: new URLPattern({ pathname: pattern }),
      handler: handle,
    });
  }

  /**
   * get appends a router for the GET method to the router.
   */
  public get(
    pattern: string,
    handle: HandleRequest,
  ): this {
    return this.with({
      method: "GET",
      pattern: new URLPattern({ pathname: pattern }),
      handler: handle,
    });
  }

  /**
   * head appends a router for the HEAD method to the router.
   */
  public head(
    pattern: string,
    handle: HandleRequest,
  ): this {
    return this.with({
      method: "HEAD",
      pattern: new URLPattern({ pathname: pattern }),
      handler: handle,
    });
  }

  /**
   * options appends a router for the OPTIONS method to the router.
   */
  public options(
    pattern: string,
    handle: HandleRequest,
  ): this {
    return this.with({
      method: "OPTIONS",
      pattern: new URLPattern({ pathname: pattern }),
      handler: handle,
    });
  }

  /**
   * patch appends a router for the PATCH method to the router.
   */
  public patch(
    pattern: string,
    handle: HandleRequest,
  ): this {
    return this.with({
      method: "PATCH",
      pattern: new URLPattern({ pathname: pattern }),
      handler: handle,
    });
  }

  /**
   * post appends a router for the POST method to the router.
   */
  public post(
    pattern: string,
    handle: HandleRequest,
  ): this {
    return this.with({
      method: "POST",
      pattern: new URLPattern({ pathname: pattern }),
      handler: handle,
    });
  }

  /**
   * put appends a router for the PUT method to the router.
   */
  public put(
    pattern: string,
    handle: HandleRequest,
  ): this {
    return this.with({
      method: "PUT",
      pattern: new URLPattern({ pathname: pattern }),
      handler: handle,
    });
  }

  /**
   * trace appends a router for the TRACE method to the router.
   */
  public trace(
    pattern: string,
    handle: HandleRequest,
  ): this {
    return this.with({
      method: "TRACE",
      pattern: new URLPattern({ pathname: pattern }),
      handler: handle,
    });
  }
}
