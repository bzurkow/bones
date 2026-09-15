"use client";

import Link from "next/link";
import { NotFoundPage } from "shared-ui";

// Next's App Router convention: this file replaces the framework's default
// 404 for any unmatched route. Shares its shell (previously a byte-for-byte
// copy) with web-app's NotFound.tsx via shared-ui's NotFoundPage --
// "/" is this site's only real route so far, but stays a safe destination
// regardless.
export default function NotFound() {
  return <NotFoundPage linkComponent={Link} linkProps={{ href: "/" }} />;
}
