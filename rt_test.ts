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
