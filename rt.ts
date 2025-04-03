import type { Route } from "@std/http/unstable-route";
import { route } from "@std/http/unstable-route";

export interface RtRoute<TState> extends Omit<Route, "handler" | "pattern"> {
  pattern: string | URLPattern;
  handler: RequestHandler<TState>;
}

export interface RtContext<TState> {
  request: Request;
  params: URLPatternResult | undefined;
  info: Deno.ServeHandlerInfo | undefined;
  next: () => Promise<Response>;
  state: TState;
}

export type RequestHandler<TState> = (
  context: RtContext<TState>,
) => Response | Promise<Response>;

export type DefaultHandler = () => Response | Promise<Response>;

export type ErrorHandler = (error: Error) => Response | Promise<Response>;

function defaultHandler() {
  return new Response("Not found", { status: 404 });
}

function errorHandler(error: Error) {
  return new Response(error.message, { status: 500 });
}

/**
 * Router is an HTTP router based on the `URLPattern` API.
 */
export class Router<TState = never> {
  public constructor(
    public routes: RtRoute<TState>[] = [],
    public initializeState: () => TState = () => ({} as TState),
    public defaultHandler?: DefaultHandler,
    public errorHandler?: ErrorHandler,
  ) {}

  /**
   * fetch invokes the router for the given request.
   */
  public async fetch(
    request: Request,
    info?: Deno.ServeHandlerInfo,
    state: TState = this.initializeState(),
  ): Promise<Response> {
    try {
      return await this.execute(
        0,
        request,
        info,
        state,
      );
    } catch (error) {
      if (error instanceof Error) {
        return await (this.errorHandler ?? errorHandler)(error);
      }

      throw error;
    }
  }

  /**
   * execute executes a route at the given index.
   */
  private execute(
    i: number,
    request: Request,
    info: Deno.ServeHandlerInfo | undefined,
    state: TState,
  ): Response | Promise<Response> {
    if (i >= this.routes.length) {
      return (this.defaultHandler ?? defaultHandler)();
    }

    const { method, pattern, handler: execute } = this.routes[i];
    const next = async () => await this.execute(i + 1, request, info, state);
    const handler = route(
      [
        {
          method,
          pattern: pattern instanceof URLPattern
            ? pattern
            : new URLPattern({ pathname: pattern }),
          handler: (request, params, info) => {
            return execute({ request, params, info, next, state });
          },
        },
      ],
      next,
    );

    return handler(request, info);
  }

  /**
   * state sets the initial state of the router.
   */
  public state(defaultState: () => TState): this {
    this.initializeState = defaultState;
    return this;
  }

  /**
   * default sets the router's default handler.
   */
  public default(handler: DefaultHandler): this {
    this.defaultHandler = handler;
    return this;
  }

  /**
   * error sets the router's error handler.
   */
  public error(handler: ErrorHandler): this {
    this.errorHandler = handler;
    return this;
  }

  /**
   * use appends a sequence of routers to the router.
   */
  public use(data: RtRoute<TState>[] | Router<TState>): this {
    if (data instanceof Router) {
      this.routes.push(...data.routes);
    } else {
      this.routes.push(...data);
    }

    return this;
  }

  /**
   * with appends a route to the router.
   */
  public with(route: RtRoute<TState>): this {
    this.routes.push(route);
    return this;
  }

  /**
   * connect appends a router for the CONNECT method to the router.
   */
  public connect(
    pattern: string | URLPattern,
    handler: RequestHandler<TState>,
  ): this {
    return this.with({
      method: "CONNECT",
      pattern,
      handler,
    });
  }

  /**
   * delete appends a router for the DELETE method to the router.
   */
  public delete(
    pattern: string | URLPattern,
    handler: RequestHandler<TState>,
  ): this {
    return this.with({
      method: "DELETE",
      pattern,
      handler,
    });
  }

  /**
   * get appends a router for the GET method to the router.
   */
  public get(
    pattern: string | URLPattern,
    handler: RequestHandler<TState>,
  ): this {
    return this.with({
      method: "GET",
      pattern,
      handler,
    });
  }

  /**
   * head appends a router for the HEAD method to the router.
   */
  public head(
    pattern: string | URLPattern,
    handler: RequestHandler<TState>,
  ): this {
    return this.with({
      method: "HEAD",
      pattern,
      handler,
    });
  }

  /**
   * options appends a router for the OPTIONS method to the router.
   */
  public options(
    pattern: string | URLPattern,
    handler: RequestHandler<TState>,
  ): this {
    return this.with({
      method: "OPTIONS",
      pattern,
      handler,
    });
  }

  /**
   * patch appends a router for the PATCH method to the router.
   */
  public patch(
    pattern: string | URLPattern,
    handler: RequestHandler<TState>,
  ): this {
    return this.with({
      method: "PATCH",
      pattern,
      handler,
    });
  }

  /**
   * post appends a router for the POST method to the router.
   */
  public post(
    pattern: string | URLPattern,
    handler: RequestHandler<TState>,
  ): this {
    return this.with({
      method: "POST",
      pattern,
      handler,
    });
  }

  /**
   * put appends a router for the PUT method to the router.
   */
  public put(
    pattern: string | URLPattern,
    handler: RequestHandler<TState>,
  ): this {
    return this.with({
      method: "PUT",
      pattern,
      handler,
    });
  }

  /**
   * trace appends a router for the TRACE method to the router.
   */
  public trace(
    pattern: string | URLPattern,
    handler: RequestHandler<TState>,
  ): this {
    return this.with({
      method: "TRACE",
      pattern,
      handler,
    });
  }
}
