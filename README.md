# rt

[![JSR][JSR badge]][JSR] [![JSR score][JSR score badge]][JSR score]
[![GitHub
Actions][GitHub Actions badge]][GitHub Actions]

Minimal HTTP router library based on the `URLPattern` API.

## Usage

```ts
import { createRouter } from "@fartlabs/rt";

const router = createRouter()
  .get("/", () => {
    return new Response("Hello, World!");
  })
  .default(() => new Response("Not found", { status: 404 }));

Deno.serve((request) => router.fetch(request));
```

### Deno

1\. [Install Deno](https://docs.deno.com/runtime/manual).

2\. Start a new Deno project.

```sh
deno init
```

3\. Add rt as a project dependency.

```sh
deno add @fartlabs/rt
```

## Contribute

We appreciate your help!

### Style

Run `deno fmt` to format the code.

Run `deno lint` to lint the code.

---

Developed with ❤️ [**@FartLabs**](https://github.com/FartLabs)

[JSR]: https://jsr.io/@fartlabs/rt
[JSR badge]: https://jsr.io/badges/@fartlabs/rt
[JSR score]: https://jsr.io/@fartlabs/rt/score
[JSR score badge]: https://jsr.io/badges/@fartlabs/rt/score
[GitHub Actions]: https://github.com/FartLabs/rt/actions/workflows/check.yaml
[GitHub Actions badge]: https://github.com/FartLabs/rt/actions/workflows/check.yaml/badge.svg
