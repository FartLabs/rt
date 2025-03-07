import { assertEquals } from "@std/assert";
import { Router } from "./rt.ts";

const router = new Router()
  .get(
    "/",
    (request) => {
      const url = new URL(request.url);
      return new Response(`Hello, ${url.searchParams.get("name") ?? "World"}!`);
    },
  );

Deno.test("Router handles GET request", async () => {
  const response = await router.fetch(
    new Request("http://localhost/?name=Deno"),
  );

  assertEquals(await response.text(), "Hello, Deno!");
});

Deno.test("Router navigates unmatched route to default handler", async () => {
  const response = await router.fetch(
    new Request("http://localhost/404"),
  );
  assertEquals(response.status, 404);
});

Deno.test("Router uses default handler for unmatched routes", async () => {
  router.default(() => new Response("Custom Not Found", { status: 404 }));

  const response = await router.fetch(
    new Request("http://localhost/unmatched"),
  );

  assertEquals(await response.text(), "Custom Not Found");
  assertEquals(response.status, 404);
});
