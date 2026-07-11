export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__content">
          <p className="eyebrow">Kevin & Micha · Building in Public</p>
          <h1 id="hero-title">More Than Rebuilding a Life.</h1>
          <p className="lead">
            Bankrupt to 1 Million is a living documentary about rebuilding from financial rock
            bottom through community, collaboration and meaningful ventures.
          </p>
          <div className="actions" aria-label="Primary actions">
            <a
              className="button button--primary"
              href="https://github.com/MyMindVentures/BankruptTo1Million/issues"
            >
              Build One Feature
            </a>
            <a
              className="button button--secondary"
              href="https://github.com/MyMindVentures/BankruptTo1Million#readme"
            >
              Read Our Mission
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
