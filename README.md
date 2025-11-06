# [@fartlabs/rt](https://jsr.io/@fartlabs/rt)

[![GitHub Actions][GitHub Actions badge]][GitHub Actions]
[![JSR][JSR badge]][JSR] [![JSR score][JSR score badge]][JSR score]

Minimal HTTP router library based on the
[`URLPattern` API](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API).

- **API docs**: See `@fartlabs/rt` on JSR →
  [`jsr.io/@fartlabs/rt`](https://jsr.io/@fartlabs/rt)

## Usage

```ts
import { Router } from "@fartlabs/rt";

const router = new Router()
  .get("/", () => new Response("Hello, World!"))
  .default(() => new Response("Not found", { status: 404 }));

Deno.serve((request) => router.fetch(request));
```

### Examples

#### Multiple methods

Handle common HTTP verbs (GET, POST, PUT, DELETE) on resourceful routes.

```ts
import { Router } from "@fartlabs/rt";

const router = new Router()
  .get("/users", () => new Response("List users"))
  .post("/users", async ({ request }) => {
    const body = await request.json();
    return Response.json({ created: true, user: body });
  })
  .put("/users/:id", async ({ params, request }) => {
    const id = params?.pathname.groups?.id;
    const body = await request.json();
    return Response.json({ updated: id, user: body });
  })
  .delete("/users/:id", ({ params }) => {
    const id = params?.pathname.groups?.id;
    return new Response(`Deleted ${id}`, { status: 204 });
  })
  .default(() => new Response("Not found", { status: 404 }));

Deno.serve((req) => router.fetch(req));
```

#### Route params and wildcards

Use URLPattern named parameters and a catch‑all wildcard for flexible matching.

```ts
const router = new Router()
  // Named params are available via URLPattern groups
  .get("/hello/:name", ({ params }) => {
    const name = params?.pathname.groups?.name ?? "World";
    return new Response(`Hello, ${name}!`);
  })
  // Wildcard catch-all
  .get("/*", () => new Response("Catch-all"));
```

#### Query parameters

Access query string values via `new URL(request.url).searchParams`.

```ts
const router = new Router().get("/search", ({ request }) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  return new Response(`You searched for: ${q}`);
});
```

#### Middleware via next() and shared state

Add middleware that enriches a shared state object and delegates with `next()`.

```ts
interface State {
  user?: { name: string };
}

const router = new Router<State>()
  // auth-like middleware that enriches state, then calls next()
  .get("/*", async ({ state, next }) => {
    state.user = { name: "Wazoo" };
    return await next();
  })
  .get("/:name", ({ params, state }) => {
    const name = params?.pathname.groups?.name;
    if (state.user?.name !== name) {
      return new Response("Forbidden", { status: 403 });
    }
    return new Response(`Hello, ${name}!`);
  });
```

#### Custom default and error handlers

Provide a custom 404 response and a centralized error handler for thrown errors.

```ts
const router = new Router()
  .get("/boom", () => {
    throw new Error("Kaboom");
  })
  .default(() => new Response("Custom 404", { status: 404 }))
  .error((err) => new Response(`Oops: ${err.message}`, { status: 500 }));
```

#### Nesting or composing routers

Compose routers by mounting one router's routes into another.

```ts
const api = new Router().get("/v1/ping", () => new Response("pong"));
const router = new Router().use(api);
```

### Deno

1\. [Install Deno](https://docs.deno.com/runtime/manual).

2\. Start a new Deno project.

```sh
deno init
```

3\. Add rt as a project dependency.

```sh
deno add jsr:@fartlabs/rt
```

### Testing

Run tests:

```sh
deno test
```

Type-check the project:

```sh
deno task check
```

## RTX

If you prefer composing routers in JSX, check out **RTX**: a library of JSX
components that build `@fartlabs/rt` routers.

- GitHub: [`github.com/FartLabs/rtx`](https://github.com/FartLabs/rtx)
- JSR docs: [`jsr.io/@fartlabs/rtx`](https://jsr.io/@fartlabs/rtx)

## Contribute

We appreciate your help!

### Style

Run `deno fmt` to format the code.

Run `deno lint` to lint the code.

## License

This project is licensed under the **WTFPL**. See [`LICENSE`](LICENSE) for
details.

---

Developed with ❤️ [**@FartLabs**](https://github.com/FartLabs)

[JSR]: https://jsr.io/@fartlabs/rt
[JSR badge]: https://jsr.io/badges/@fartlabs/rt
[JSR score]: https://jsr.io/@fartlabs/rt/score
[JSR score badge]: https://jsr.io/badges/@fartlabs/rt/score
[GitHub Actions]: https://github.com/FartLabs/rt/actions/workflows/check.yaml
[GitHub Actions badge]: https://github.com/FartLabs/rt/actions/workflows/check.yaml/badge.svg
