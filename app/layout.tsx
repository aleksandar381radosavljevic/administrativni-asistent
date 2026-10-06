import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administrativni asistent",
  description:
    "Vodič kroz administrativne procedure u Srbiji, po životnim događajima.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sr-Latn">
      <body>{children}</body>
    </html>
  );
}
