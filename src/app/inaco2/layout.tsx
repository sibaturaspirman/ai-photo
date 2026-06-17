import "./google-sans.css";

export default function InacoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="inaco-app min-h-dvh">{children}</div>;
}
