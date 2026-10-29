export const metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <article className="prose-page">
      <p className="eyebrow">Legal</p>
      <h1>Terms of use</h1>
      <p>
        t1-paste is provided as-is, without warranties. You are responsible for the content you
        upload and for complying with applicable law.
      </p>
      <p>
        Do not use the service for illegal content, malware distribution, harassment, phishing, or
        spam. We may remove content and restrict access to protect the service and its users.
      </p>
      <p>
        Anonymous pastes expire automatically. We may delete any paste at any time for operational,
        security, or abuse reasons.
      </p>
      <p>
        The source code is licensed under AGPL-3.0. The hosted service is operated by Transistor
        One.
      </p>
    </article>
  );
}
