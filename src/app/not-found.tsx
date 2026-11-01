import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Page not found — LeetSuggest",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center px-5 py-16">
      <div className="absolute right-5 top-5">
        <ThemeToggle compact />
      </div>

      <section className="card-surface w-full max-w-lg animate-rise p-8 text-center sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[1.2rem] bg-ink font-serif text-3xl text-lime shadow-sm dark:text-on-lime">
          L
        </div>
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">This page slipped the list.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
          The route you followed does not exist. Head back to your study dashboard and keep the
          streak alive.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" />
          Back to LeetSuggest
        </Link>
      </section>
    </main>
  );
}
