import Link from "next/link";
import Image from "next/image";
import { SimpleFamilyTreeDemo } from "@/components/simple-family-tree-demo";
import logo from "../../../public/logo-transparent.png";

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

export default function HomePage() {
  return (
    <>
      <header className="landing-header">
        <Link href="/" className="landing-brand" aria-label="@memoir/tree home">
          <Image src={logo} alt="" className="landing-brand-logo" />
          <span>@memoir/tree</span>
        </Link>
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link href="/docs">Docs</Link>
          <a href="#demo">Demo</a>
        </nav>
      </header>

      <main className="landing-page">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="brand-kicker" aria-hidden="true">
              <span className="brand-dot" aria-hidden="true" />
              <span>React family tree layout</span>
            </div>
            <h1>
              Family trees that stay readable in real React apps.
            </h1>
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
              <span>React 18+</span>
              <span>TypeScript</span>
              <span>custom cards</span>
              <span>measured layout</span>
            </div>
          </div>
          <div className="hero-preview" aria-label="Family tree preview">
            <div className="preview-card preview-card--top">Grandparent</div>
            <div className="preview-branch" aria-hidden="true" />
            <div className="preview-row">
              <div className="preview-card">Parent</div>
              <div className="preview-card preview-card--accent">Parent</div>
            </div>
            <div className="preview-branch" aria-hidden="true" />
            <div className="preview-card preview-card--subject">Subject</div>
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
            <p className="eyebrow">Simple renderer</p>
            <h2>Install it, pass your data, render product-style cards.</h2>
            <p>
              The package owns the measured layout, connectors, pan surface, and zoom behavior. Your app owns the data,
              profile UI, permissions, and mutations.
            </p>
          </div>
          <div className="demo-panel">
            <div className="demo-copy">
              <p className="tree-example-label">Package-ready API</p>
              <h3>Controlled React renderer, not a family tree app in a box.</h3>
              <p>
                Use `profiles`, `relationships`, `rootProfileId`, and a custom card. The black-shadow card style is
                just CSS on top of stable data attributes.
              </p>
              <pre aria-label="Install command">
                <code>bun add @memoir/tree</code>
              </pre>
            </div>
            <SimpleFamilyTreeDemo />
          </div>
        </section>
      </main>
    </>
  );
}
