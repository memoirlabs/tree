import Link from "next/link";
import Image from "next/image";
import { InstallCommand } from "@/components/install-command";
import { SimpleFamilyTreeDemo } from "@/components/simple-family-tree-demo";
import { highlightTsx } from "@/lib/highlight";
import logo from "../../../public/logo-transparent.png";

const exampleCode = `import { FamilyTree, rel } from "@memoir/tree";

const profiles = {
  maren: { id: "maren", name: "Maren" },
  june:  { id: "june",  name: "June"  },
  ellis: { id: "ellis", name: "Ellis" },
  noa:   { id: "noa",   name: "Noa"   },
  sol:   { id: "sol",   name: "Sol"   },
  river: { id: "river", name: "River" },
};

const relationships = [
  rel.parents("june", ["maren"]),
  rel.parents("noa",  ["june", "ellis"]),
  rel.partner("noa",  "sol", { relation: "spouse" }),
  rel.children(["noa", "sol"], ["river"]),
];

export function Tree() {
  return (
    <FamilyTree
      profiles={profiles}
      relationships={relationships}
      rootProfileId="noa"
      renderProfileCard={(p, props) => (
        <article {...props}>{p.name}</article>
      )}
    />
  );
}`;

const features = [
  {
    title: "Subject-centered",
    description: "Start with one person and render the relatives that matter around them.",
  },
  {
    title: "Bring your own cards",
    description: "Use your app's data and card component instead of fighting a fixed UI.",
  },
  {
    title: "Measured layout",
    description: "Cards can be different sizes while the tree keeps relationships readable.",
  },
];

export default async function HomePage() {
  const highlightedCode = await highlightTsx(exampleCode);
  return (
    <>
      <header className="landing-header">
        <a
          href="https://www.npmjs.com/package/@memoir/tree"
          target="_blank"
          rel="noreferrer"
          className="landing-brand"
          aria-label="@memoir/tree on npm"
        >
          <span>@memoir/tree</span>
        </a>
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link href="/docs">Docs</Link>
          <a
            href="https://github.com/memoirlabs/tree"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="landing-nav-icon"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.97 3.22 9.18 7.69 10.67.56.1.77-.24.77-.54 0-.27-.01-1.16-.02-2.1-3.13.68-3.79-1.34-3.79-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.94.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.43.11-2.99 0 0 .95-.3 3.1 1.16.9-.25 1.86-.37 2.82-.38.96.01 1.92.13 2.82.38 2.15-1.46 3.1-1.16 3.1-1.16.61 1.56.23 2.71.11 2.99.72.79 1.16 1.8 1.16 3.03 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.08 0 1.5-.01 2.71-.01 3.08 0 .3.2.65.78.54 4.46-1.5 7.68-5.7 7.68-10.67C23.25 5.48 18.27.5 12 .5z" />
            </svg>
          </a>
        </nav>
      </header>

      <main className="landing-page">
        <section className="hero-section">
          <div className="hero-copy">
            <Image src={logo} alt="@memoir/tree" className="hero-logo" priority />
            <h1>Family trees and org charts for React apps.</h1>
            <p>
              @memoir/tree renders subject-centered family neighborhoods from your profiles, your relationship facts,
              and your card component.
            </p>
            <div className="hero-actions" aria-label="Landing page actions">
              <Link className="primary-button" href="/docs">
                Read the docs
              </Link>
              <a className="secondary-button" href="#demo">
                See the renderer
              </a>
            </div>
            <div className="hero-highlights" aria-label="Package highlights">
              <span>Built for React 19</span>
              <span>By Memoir Labs</span>
            </div>
          </div>
          <div className="hero-preview" aria-label="Family tree preview">
            <svg
              className="preview-lines"
              viewBox="0 0 400 520"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M200 112 V192 H312 V271 M88 271 H312 M200 271 V437"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="preview-node preview-node--gp">
              <span className="preview-tag">Generation 1</span>
              <span className="preview-name">Grandparent</span>
            </div>
            <div className="preview-node preview-node--p1">
              <span className="preview-tag">Generation 2</span>
              <span className="preview-name">Parent</span>
            </div>
            <div className="preview-node preview-node--p2">
              <span className="preview-tag">Generation 2</span>
              <span className="preview-name">Parent</span>
            </div>
            <div className="preview-node preview-node--subject">
              <span className="preview-tag">Generation 3</span>
              <span className="preview-name">Child</span>
            </div>
          </div>
        </section>

        <section className="feature-section" aria-label="What the package does">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>

        <section id="demo" className="demo-section" aria-label="Family tree demo">
          <div className="section-heading">
            <h2>Drop it in. Pass your data. Ship the tree.</h2>
            <p>
              The package owns the measured layout, connectors, and pan surface. Your app owns the data,
              profile UI, permissions, and mutations.
            </p>
          </div>

          <div className="demo-copy demo-copy--standalone">
            <p className="tree-example-label">Install</p>
            <pre aria-label="Install command">
              <InstallCommand command="bun add @memoir/tree" />
            </pre>
          </div>

          <div className="code-demo-panel">
            <div
              className="code-block"
              aria-label="Family tree example code"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
            <SimpleFamilyTreeDemo />
          </div>
        </section>

        <footer className="landing-footer">
          <a href="https://labs.memoir.ag" target="_blank" rel="noreferrer">
            © Memoir Labs 2026
          </a>
        </footer>
      </main>
    </>
  );
}
