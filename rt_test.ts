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
