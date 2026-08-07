import type { Metadata } from "next";
import { Fredoka, DM_Sans } from "next/font/google";
import "./globals.css";
import { SITE_URL, GA_MEASUREMENT_ID } from "@/lib/config";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dmsans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const DEFAULT_TITLE =
  "Butter Love | Mantequillas de maní y frutos secos 100% naturales";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    // Las páginas hijas solo declaran su propio título; el sufijo de marca se
    // agrega aquí para no repetirlo (ni desincronizarlo) en cada archivo.
    template: "%s | Butter Love",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "mantequilla de maní",
    "mantequilla de pistacho",
    "mantequilla de almendras",
    "mantequilla de merey",
    "mantequilla de maní sin azúcar",
    "mantequilla de frutos secos",
    "crema de frutos secos natural",
    "mantequilla de maní Venezuela",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sin esto Google recorta la miniatura del producto en los resultados.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_VE",
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fredoka.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink font-body">
        <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />
        {children}
      </body>
    </html>
  );
}
