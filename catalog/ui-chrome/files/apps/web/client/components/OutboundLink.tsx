import type { ComponentProps } from "react";

type OutboundLinkProps = ComponentProps<"a"> & {
  href: string;
};

/** User-supplied URL. Always opens in a new tab. */
export function OutboundLink({ href, children, ...props }: OutboundLinkProps) {
  return (
    <a {...props} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
