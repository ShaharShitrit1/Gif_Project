import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold border-2 border-line transition-transform duration-150 select-none " +
  "active:translate-y-[2px] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40";

const variants: Record<Variant, string> = {
  primary: "bg-ember text-ember-ink shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)] hover:-translate-y-0.5",
  secondary: "bg-surface text-ink shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)] hover:-translate-y-0.5",
  dark: "bg-ink text-paper shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)] hover:-translate-y-0.5",
  ghost: "bg-transparent border-transparent text-ink hover:bg-surface-2",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-lg",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
