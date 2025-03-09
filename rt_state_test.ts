import { assertEquals } from "@std/assert";
import { Router } from "./rt.ts";

interface State {
  user?: User;
}

interface User {
  name: string;
}

const router = new Router<State>()
  .get(
    "/*",
    async ({ next, state }) => {
      state.user = state.user ?? { name: "Wazoo" };
      return await next();
    },
  )
  .get(
    "/:name",
    ({ params, state }) => {
      if (state.user === undefined) {
        return new Response("Unauthorized", { status: 401 });
      }

      const name = params?.pathname.groups?.name;
      if (state.user.name !== name) {
        return new Response("Forbidden", { status: 403 });
      }

      return new Response(`Hello, ${name}!`);
    },
  );

Deno.test("Router preserves state", async () => {
  const response = await router.fetch(
    new Request("http://localhost/Wazoo"),
  );
  assertEquals(await response.text(), "Hello, Wazoo!");
});

const nestedRouter = new Router<State>()
  .get(
    "/*",
    ({ request, info, state }) => router.fetch(request, info, state),
  );

Deno.test("Router nests routers", async () => {
  const response = await nestedRouter.fetch(
    new Request("http://localhost/Wazoo"),
  );
  assertEquals(await response.text(), "Hello, Wazoo!");
});
