/**
 * createRouter creates a new router.
 */
export function createRouter<T>(
  fn?: (r: Router<T>) => Router<T>,
  state?: RouterState<T>,
): Router<T> {
  const router = new Router<T>(state);
  if (fn) {
    return fn(router);
  }

  return router;
}

/**
 * METHODS is the list of HTTP methods.
 */
export const METHODS = [
  "CONNECT",
  "DELETE",
  "GET",
  "HEAD",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
  "TRACE",
] as const;

/**
 * Method is a type which represents an HTTP method.
 */
export type Method = typeof METHODS[number];

/**
 * Match is a type which matches a Request object.
 */
export type Match =
  | ((r: RouterRequest) => boolean | Promise<boolean>)
  | {
    /**
     * pattern is the URL pattern to match on.
     */
    pattern?: URLPattern;

    /**
     * method is the HTTP method to match on.
     */
    method?: Method;
  };

/**
 * Handle is called to handle a request.
 */
export interface Handle<TParam extends string = string, TState = unknown> {
  (ctx: RouterContext<TParam, TState>): Promise<Response> | Response;
}

/**
 * ErrorHandle is called to handle an error.
 */
export interface ErrorHandle {
  (error: Error): Promise<Response> | Response;
}

/**
 * DefaultHandle is called to handle a request when no routes are matched.
 */
type DefaultHandle<TState> = Handle<never, TState>;

/**
 * Route represents a the pairing of a matcher and a handler.
 */
export interface Route<TParam extends string = string, TState = unknown> {
  /**
   * match is called to match a request.
   */
  match?: Match;

  /**
   * handle is called to handle a request.
   */
  handle: Handle<TParam, TState>;
}

/**
 * Routes is a sequence of routes.
 */
export type Routes<TParam extends string = string, TState = unknown> = Array<
  Route<TParam, TState>
>;

/**
 * RouterContext is the object passed to a router.
 */
export interface RouterContext<TParam extends string, TState>
  extends RouterRequest {
  /**
   * params is a map of matched parameters from the URL pattern.
   */
  params: { [key in TParam]: string };

  /**
   * state is the state passed to the router. Modify this to pass data between
   * routes.
   */
  state: TState;

  /**
   * next executes the next matched route in the sequence. If no more routes are
   * matched, the default handler is called.
   */
  next: () => Promise<Response>;
}

/**
 * RouterRequest is the object passed to a router.
 */
interface RouterRequest {
  /**
   * request is the original request object.
   */
  request: Request;

  /**
   * url is the parsed fully qualified URL of the request.
   */
  url: URL;
}

/**
 * RouterState is the state passed to a router.
 */
type RouterState<T> = (r: RouterRequest) => T;

/**
 * RouterInterface is the interface for a router.
 */
type RouterInterface<T> = Record<
  Lowercase<Method>,
  ((pattern: string, handle: Handle) => Router<T>)
>;

/**
 * Router is an HTTP router based on the `URLPattern` API.
 */
export class Router<T> implements RouterInterface<T> {
  public routes: Routes<string, T> = [];
  public defaultHandle?: DefaultHandle<T>;
  public errorHandle?: ErrorHandle;

  public constructor(public readonly state?: RouterState<T>) {}

  /**
   * fetch invokes the router for the given request.
   */
  public async fetch(
    request: Request,
    url: URL = new URL(request.url),
    state: T =
      (this.state !== undefined ? this.state({ request, url }) : {}) as T,
    i = 0,
  ): Promise<Response> {
    try {
      while (i < this.routes.length) {
        const route = this.routes[i];
        const matchedMethod = route.match === undefined ||
          typeof route.match !== "function" &&
            (route.match.method === undefined ||
              route.match.method === request.method);
        if (!matchedMethod) {
          i++;
          continue;
        }

        const matchedFn = typeof route.match === "function" &&
          await route.match({ request, url });
        const matchedPattern = route.match !== undefined &&
          typeof route.match !== "function" &&
          route.match.pattern !== undefined &&
          route.match.pattern.exec(request.url);
        let params: Record<string, string> = {};
        if (matchedPattern) {
          params = matchedPattern?.pathname
            ? Object.entries(matchedPattern.pathname.groups)
              .reduce(
                (groups, [key, value]) => {
                  if (value !== undefined) {
                    groups[key] = value;
                  }

                  return groups;
                },
                {} as { [key: string]: string },
              )
            : {};
        }

        // If the route matches, call it and return the response.
        if (route.match === undefined || matchedFn || matchedPattern) {
          return await route.handle({
            request,
            url,
            params,
            state,
            next: () => this.fetch(request, url, state, i + 1),
          });
        }

        i++;
      }

      if (this.defaultHandle !== undefined) {
        return await this.defaultHandle({
          request,
          url,
          params: {},
          state,
          next: () => {
            throw new Error("next() called from default handler");
          },
        });
      }
    } catch (error) {
      if (this.errorHandle !== undefined) {
        return await this.errorHandle(error);
      }
    }

    return new Response("Internal Server Error", { status: 500 });
  }

  /**
   * with appends a route to the router.
   */
  public with<TParam extends string>(route: Route<TParam, T>): this;
  public with<TParam extends string>(
    match: Match,
    handle: Handle<TParam, T>,
  ): this;
  public with<TParam extends string>(
    routeOrMatch: Match | Route<TParam, T>,
    handle?: Handle<TParam, T>,
  ): this {
    if (handle === undefined && "handle" in routeOrMatch) {
      this.routes.push(routeOrMatch);
    } else if (handle !== undefined && !("handle" in routeOrMatch)) {
      this.routes.push({ match: routeOrMatch, handle });
    } else {
      throw new Error("Invalid arguments");
    }

    return this;
  }

  /**
   * use appends a sequence of routers to the router.
   */
  public use(data: Routes | Router<T>): this {
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
  public default(handle: DefaultHandle<T> | undefined): this {
    this.defaultHandle = handle;
    return this;
  }

  /**
   * error sets the router's error handler.
   */
  public error(handle: ErrorHandle | undefined): this {
    this.errorHandle = handle;
    return this;
  }

  /**
   * connect appends a router for the CONNECT method to the router.
   */
  public connect<TParam extends string>(
    pattern: string,
    handle: Handle<TParam, T>,
  ): this {
    return this.with({
      method: "CONNECT",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * delete appends a router for the DELETE method to the router.
   */
  public delete<TParam extends string>(
    pattern: string,
    handle: Handle<TParam, T>,
  ): this {
    return this.with({
      method: "DELETE",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * get appends a router for the GET method to the router.
   */
  public get<TParam extends string>(
    pattern: string,
    handle: Handle<TParam, T>,
  ): this {
    return this.with({
      method: "GET",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * head appends a router for the HEAD method to the router.
   */
  public head<TParam extends string>(
    pattern: string,
    handle: Handle<TParam, T>,
  ): this {
    return this.with({
      method: "HEAD",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * options appends a router for the OPTIONS method to the router.
   */
  public options<TParam extends string>(
    pattern: string,
    handle: Handle<TParam, T>,
  ): this {
    return this.with({
      method: "OPTIONS",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * patch appends a router for the PATCH method to the router.
   */
  public patch<TParam extends string>(
    pattern: string,
    handle: Handle<TParam, T>,
  ): this {
    return this.with({
      method: "PATCH",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * post appends a router for the POST method to the router.
   */
  public post<TParam extends string>(
    pattern: string,
    handle: Handle<TParam, T>,
  ): this {
    return this.with({
      method: "POST",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * put appends a router for the PUT method to the router.
   */
  public put<TParam extends string>(
    pattern: string,
    handle: Handle<TParam, T>,
  ): this {
    return this.with({
      method: "PUT",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * trace appends a router for the TRACE method to the router.
   */
  public trace<TParam extends string>(
    pattern: string,
    handle: Handle<TParam, T>,
  ): this {
    return this.with({
      method: "TRACE",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }
}
