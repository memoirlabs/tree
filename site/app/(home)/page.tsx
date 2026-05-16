import Link from "next/link";
import Image from "next/image";
import { Playground } from "@/components/playground";
import logo from "../../../public/logo-transparent.png";

export default function HomePage() {
  return (
    <>
      <header className="landing-header">
        <Link href="/" className="landing-brand" aria-label="@memoir/tree home">
          <Image src={logo} alt="" priority className="landing-brand-logo" />
          <span>@memoir/tree</span>
        </Link>
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link href="/docs">Docs</Link>
          <a href="#playground">Playground</a>
        </nav>
      </header>

      <main className="landing-page">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="brand-kicker">
              <span className="brand-dot" aria-hidden="true" />
              <p className="eyebrow">@memoir/tree</p>
            </div>
            <h1>Ergonomic family trees for React apps.</h1>
            <p>
              Render subject-centered family neighborhoods from app-owned people, relationship facts, and one card
              component.
            </p>
            <div className="hero-actions">
              <Link href="/docs" className="primary-button">
                Read the docs
              </Link>
              <a href="#playground" className="secondary-button">
                View playground
              </a>
            </div>
          </div>
          <div className="hero-panel" aria-label="Memoir Tree logo and package highlights">
            <Image src={logo} alt="Tree logo" priority placeholder="blur" className="hero-logo" />
            <div className="hero-badges" aria-label="Package highlights">
              <span>React 19</span>
              <span>TypeScript</span>
              <span>unstyled</span>
              <span>measured layout</span>
            </div>
          </div>
        </section>

        <section id="playground" className="playground-section">
          <div className="section-heading">
            <p className="eyebrow">Playground</p>
            <h2>See the library running in the docs site.</h2>
            <p>The examples below reuse the local package source, so docs and visual verification live together.</p>
          </div>
          <Playground />
        </section>
      </main>
    </>
  );
}
