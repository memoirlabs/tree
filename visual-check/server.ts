const root = import.meta.dir;

async function bundleClient(): Promise<Response> {
  const result = await Bun.build({
    entrypoints: [`${root}/src/main.tsx`],
    minify: false,
    sourcemap: "inline",
    target: "browser",
  });

  if (!result.success) {
    return new Response(result.logs.map((log) => log.message).join("\n"), { status: 500 });
  }

  return new Response(await result.outputs[0].text(), {
    headers: { "Content-Type": "text/javascript" },
  });
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4177),
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file(`${root}/index.html`), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/src/main.tsx") return bundleClient();

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Visual check running at http://localhost:${server.port}`);
