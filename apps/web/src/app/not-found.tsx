import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found">
      <p className="eyebrow">404</p>
      <h1>This paste does not exist.</h1>
      <p>It may have expired, been deleted, or never existed.</p>
      <Link className="button button-primary" href="/new">
        Create a new paste
      </Link>
    </div>
  );
}
