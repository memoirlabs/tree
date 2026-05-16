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
            </div>
            <h1>
              Ergonomic family <span className="text-red">trees</span> for{" "}
              <span className="text-yellow">React apps</span>.
            </h1>
            <p>
              Render subject-centered family neighborhoods and org charts from app-owned people,
              relationship facts, and one card component.
            </p>
            <div className="hero-highlights" aria-label="Package highlights">
              <span>React 18+</span>
              <span>TypeScript</span>
              <span>unstyled</span>
              <span>measured layout</span>
            </div>
          </div>
        </section>

        <section id="playground" className="playground-section" aria-label="Family tree playground">
          <div className="section-heading">
            <p className="eyebrow">Live example</p>
            <h2>Names, relationships, and layout. Nothing extra.</h2>
          </div>
          <Playground />
        </section>
      </main>
    </>
  );
}
