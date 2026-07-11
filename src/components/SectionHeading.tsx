type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  titleId: string;
  children: string;
};

export function SectionHeading({ eyebrow, title, titleId, children }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={titleId}>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
