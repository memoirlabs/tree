import index from "./index.html";

Bun.serve({
  port: Number(Bun.env.PORT ?? 4321),
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Memoir Tree playground running at http://localhost:4321");
