import "./google-sans.css";
import { InacoModelVersionSync } from "@/components/inaco/inaco-model-version-sync";

export default function InacoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="inaco-app min-h-dvh">
      <InacoModelVersionSync />
      {children}
    </div>
  );
}
