/**
 * createRouter creates a new router.
 */
export function createRouter(fn?: (r: Router) => Router): Router {
  const router = new Router();
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
  | ((detail: { request: Request; url: URL }) => Promise<boolean>)
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
export interface Handle<T extends string = string> {
  (ctx: RouterContext<T>): Promise<Response> | Response;
}

/**
 * ErrorHandle is called to handle an error.
 */
export interface ErrorHandle {
  (error: Error): Promise<Response> | Response;
}

/**
 * Route represents a the pairing of a matcher and a handler.
 */
export interface Route<T extends string = string> {
  /**
   * handle is called to handle a request.
   */
  handle: Handle<T>;

  /**
   * match is called to match a request.
   */
  match?: Match;
}

/**
 * Routes is a sequence of routes.
 */
export type Routes<T extends string = string> = Route<T>[];

/**
 * RouterContext is the object passed to a router.
 */
export interface RouterContext<T extends string> {
  /**
   * request is the original request object.
   */
  request: Request;

  /**
   * url is the parsed fully qualified URL of the request.
   */
  url: URL;

  /**
   * params is a map of matched parameters from the URL pattern.
   */
  params: { [key in T]: string };

  /**
   * next executes the next matched route in the sequence. If no more routes are
   * matched, the default handler is called.
   */
  next: () => Promise<Response>;
}

/**
 * RouterInterface is the interface for a router.
 */
type RouterInterface = Record<
  Lowercase<Method>,
  ((pattern: string, handle: Handle) => Router)
>;

/**
 * Router is an HTTP router based on the `URLPattern` API.
 */
export class Router implements RouterInterface {
  public routes: Routes = [];
  public defaultHandle?: Handle;
  public errorHandle?: ErrorHandle;

  /**
   * fetch invokes the router for the given request.
   */
  public async fetch(request: Request, i = 0): Promise<Response> {
    try {
      const url = new URL(request.url);
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
            next: () => this.fetch(request, i + 1),
          });
        }

        i++;
      }

      if (this.defaultHandle !== undefined) {
        return await this.defaultHandle({
          request,
          url,
          params: {},
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
  public with<T extends string>(route: Route<T>): this;
  public with<T extends string>(
    match: Match,
    handle: Handle<T>,
  ): this;
  public with<T extends string>(
    routeOrMatch: Match | Route<T>,
    handle?: Handle<T>,
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
  public use(data: Routes | Router): this {
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
  public default(handle: Handle | undefined): this {
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
  public connect<T extends string>(
    pattern: string,
    handle: Handle<T>,
  ): this {
    return this.with({
      method: "CONNECT",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * delete appends a router for the DELETE method to the router.
   */
  public delete<T extends string>(
    pattern: string,
    handle: Handle<T>,
  ): this {
    return this.with({
      method: "DELETE",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * get appends a router for the GET method to the router.
   */
  public get<T extends string>(
    pattern: string,
    handle: Handle<T>,
  ): this {
    return this.with({
      method: "GET",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * head appends a router for the HEAD method to the router.
   */
  public head<T extends string>(
    pattern: string,
    handle: Handle<T>,
  ): this {
    return this.with({
      method: "HEAD",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * options appends a router for the OPTIONS method to the router.
   */
  public options<T extends string>(
    pattern: string,
    handle: Handle<T>,
  ): this {
    return this.with({
      method: "OPTIONS",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * patch appends a router for the PATCH method to the router.
   */
  public patch<T extends string>(
    pattern: string,
    handle: Handle<T>,
  ): this {
    return this.with({
      method: "PATCH",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * post appends a router for the POST method to the router.
   */
  public post<T extends string>(
    pattern: string,
    handle: Handle<T>,
  ): this {
    return this.with({
      method: "POST",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * put appends a router for the PUT method to the router.
   */
  public put<T extends string>(
    pattern: string,
    handle: Handle<T>,
  ): this {
    return this.with({
      method: "PUT",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }

  /**
   * trace appends a router for the TRACE method to the router.
   */
  public trace<T extends string>(
    pattern: string,
    handle: Handle<T>,
  ): this {
    return this.with({
      method: "TRACE",
      pattern: new URLPattern({ pathname: pattern }),
    }, handle);
  }
}
