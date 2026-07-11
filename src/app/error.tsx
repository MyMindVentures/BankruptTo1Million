"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="hero">
      <div className="container hero__content">
        <p className="eyebrow">Something went wrong</p>
        <h1>We hit an unexpected setback.</h1>
        <p className="lead">
          The journey continues. Try loading this part of the platform again.
        </p>
        <div className="actions">
          <button className="button button--primary" type="button" onClick={reset}>
            Try Again
          </button>
        </div>
      </div>
    </main>
  );
}
