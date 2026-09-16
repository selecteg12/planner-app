export default function SectionPage({ title }) {
  return (
    <section className="px-5 pt-8">
      <p className="mb-2 text-sm font-medium text-muted">Планер</p>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
    </section>
  );
}
