import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main id="main-content" className="hero">
      <div className="container hero__content">
        <p className="eyebrow">404 · Page not found</p>
        <h1>This part of the story is not here yet.</h1>
        <p className="lead">
          The page may have moved, or it may still be waiting to be built by a future Founding
          Builder.
        </p>
        <div className="actions">
          <Link className="button button--primary" href="/">
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
