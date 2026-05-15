declare module "*.html" {
  const contents: import("bun").HTMLBundle;
  export default contents;
}
