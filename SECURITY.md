# Security Policy

## Supported versions

t1-paste is in early development. Only the `main` branch is supported until the
first release.

## Reporting a vulnerability

Please email **security@transistorone.com**.

Do not open a public issue, discussion, or pull request for a vulnerability.

Include:

- A description of the issue.
- Steps to reproduce.
- The affected route, command, or component.
- The impact you believe it has.
- Any suggested fix.

We aim to acknowledge reports within 72 hours and will keep you updated as we
investigate. Please give us reasonable time to fix the issue before public
disclosure.

## Scope

Examples of in-scope issues:

- Authentication, session, or token flaws.
- Authorization bypass on pastes or admin routes.
- XSS, CSRF, SSRF, or SQL injection.
- Rate-limit bypass.
- Agent registration, claim, or credential flaws.
- Secret exposure.

## Out of scope

- Missing security headers with no demonstrated impact.
- Spam or abuse reports. Use **abuse@transistorone.com** for those.
- Social engineering.
- Denial-of-service reports without a specific bypass or amplification vector.

## Safe harbor

We will not pursue legal action for good-faith security research that follows
this policy and does not access, modify, or disclose other users' data.
