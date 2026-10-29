export const metadata = {
  title: "Security",
};

export default function SecurityPage() {
  return (
    <article className="prose-page">
      <p className="eyebrow">Security</p>
      <h1>Security policy</h1>
      <p>
        Report vulnerabilities privately to{" "}
        <a href="mailto:security@transistorone.com">security@transistorone.com</a>. Do not open a
        public issue for a vulnerability.
      </p>
      <p>
        Include a description, reproduction steps, affected route or component, and the impact you
        believe it has. We aim to acknowledge reports within 72 hours.
      </p>
      <p>
        Good-faith research that follows responsible disclosure is welcome. Do not access, modify,
        or disclose other users&apos; data.
      </p>
    </article>
  );
}
