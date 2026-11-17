import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function Card({ title, description, children }: CardProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      {title ? (
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
