import { assertEquals } from "@std/assert";
import { createRouter } from "./rt.ts";

const router = createRouter()
  .get(
    "/",
    ({ url }) =>
      new Response(`Hello, ${url.searchParams.get("name") ?? "World"}!`),
  )
  .default(() => new Response("Not found", { status: 404 }));

Deno.test("createRouter handles GET request", async () => {
  const response = await router.fetch(
    new Request("http://localhost/?name=Deno"),
  );

  assertEquals(await response.text(), "Hello, Deno!");
});

Deno.test("createRouter navigates unmatched route to default handler", async () => {
  const response = await router.fetch(
    new Request("http://localhost/404"),
  );
  assertEquals(response.status, 404);
});

const statefulRouter = createRouter(
  (r) =>
    r
      .get(
        "/*",
        async (ctx) => {
          ctx.state.user = { name: "Alice" };
          return await ctx.next();
        },
      )
      .get<"name">(
        "/:name",
        (ctx) => {
          if (ctx.state.user === null) {
            return new Response("Unauthorized", { status: 401 });
          }

          if (ctx.state.user.name !== ctx.params.name) {
            return new Response("Forbidden", { status: 403 });
          }

          return new Response(`Hello, ${ctx.params.name}!`);
        },
      ),
  (): { user: User | null } => ({ user: null }),
);

interface User {
  name: string;
}

Deno.test("createRouter preserves state", async () => {
  const response = await statefulRouter.fetch(
    new Request("http://localhost/Alice"),
  );
  assertEquals(await response.text(), "Hello, Alice!");
});

const nestedRouter = createRouter()
  .get(
    "/*",
    (ctx) => statefulRouter.fetch(ctx.request),
  );

Deno.test("createRouter nests routers", async () => {
  const response = await nestedRouter.fetch(
    new Request("http://localhost/Alice"),
  );
  assertEquals(await response.text(), "Hello, Alice!");
});
