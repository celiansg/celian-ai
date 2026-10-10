import type { Metadata } from "next";
import "./globals.css";
import { WorkspaceLayout } from "@/components/workspace-layout";

export const metadata: Metadata = {
  title: "Célian AI | Votre workspace augmenté",
  description: "Un workspace personnel piloté par des agents IA spécialisés.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body><WorkspaceLayout>{children}</WorkspaceLayout></body>
    </html>
  );
}
