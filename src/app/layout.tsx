import type { Metadata } from "next";
import { loadClientConfig } from "@/config/client-loader";
import { DemoBanner } from "@/components/shared/DemoBanner";
import "./globals.css";

export function generateMetadata(): Metadata {
  const config = loadClientConfig();
  return {
    title: config.seo.title,
    description: config.seo.description,
    keywords: config.seo.keywords,
    openGraph: {
      title: config.seo.title,
      description: config.seo.description,
      type: "website",
      images: config.seo.ogImage ? [{ url: config.seo.ogImage }] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = loadClientConfig();

  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --brand-primary: ${config.colors.primary};
              --brand-primary-hover: ${config.colors.primaryHover || config.colors.primary};
              --brand-accent: ${config.colors.accent || config.colors.primary};
            }
          `
        }} />
      </head>
      <body className="bg-white text-slate-800 antialiased">
        <DemoBanner banner={config.demoBanner} />
        {children}
      </body>
    </html>
  );
}
