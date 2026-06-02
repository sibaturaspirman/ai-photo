import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

type EigerShellProps = {
  children: ReactNode;
  background?: "choose" | "page" | "tryon" | "black" | "none";
  scroll?: boolean;
  className?: string;
};

const EIGER_BG_SRC: Partial<Record<NonNullable<EigerShellProps["background"]>, string>> = {
  choose: "/eiger/bg-choose.jpg",
  page: "/eiger/bg.png",
  tryon: "/eiger/bg2.png",
};

const EIGER_BG_POSITION: Partial<Record<NonNullable<EigerShellProps["background"]>, string>> = {
  choose: "object-center",
  page: "object-bottom",
  tryon: "object-top",
};

export function EigerShell({
  children,
  background = "choose",
  scroll = false,
  className = "",
}: EigerShellProps) {
  const bgSrc = background ? EIGER_BG_SRC[background] : undefined;
  const bgPosition = background ? EIGER_BG_POSITION[background] : "object-center";

  return (
    <div className="eiger-viewport">
      <main
        className={`eiger-shell ${background === "black" ? "eiger-shell--black" : ""} ${scroll ? "eiger-shell--scroll" : ""} ${className}`.trim()}
      >
        {bgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgSrc}
            alt=""
            className={`pointer-events-none absolute inset-0 z-0 h-full w-full object-cover ${bgPosition}`}
            aria-hidden
          />
        ) : null}
        <div className="eiger-shell__content">{children}</div>
      </main>
    </div>
  );
}

export function EigerContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`eiger-content ${className}`.trim()}>{children}</div>;
}

export function EigerButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      className={`eiger-btn ${variant === "secondary" ? "eiger-btn--secondary" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function EigerButtonLink({
  children,
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  return (
    <Link
      className={`eiger-btn ${variant === "secondary" ? "eiger-btn--secondary" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </Link>
  );
}
