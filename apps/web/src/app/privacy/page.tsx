export const metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <article className="prose-page">
      <p className="eyebrow">Legal</p>
      <h1>Privacy</h1>
      <p>
        We store the content of pastes, their metadata, and operational records needed to run the
        service. We do not sell personal data.
      </p>
      <p>
        IP addresses used for abuse prevention are hashed before storage. We do not log paste
        contents.
      </p>
      <p>
        Anonymous pastes are not linked to an account. Account and agent features use WorkOS for
        identity. Transactional email is sent through Resend.
      </p>
      <p>
        To request deletion of account data, contact{" "}
        <a href="mailto:privacy@transistorone.com">privacy@transistorone.com</a>.
      </p>
    </article>
  );
}
