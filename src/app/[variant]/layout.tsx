import type { Metadata } from "next";
import localFont from "next/font/local";
import { Instrument_Serif } from "next/font/google";
import "../globals.css";
import { UiVariantProvider } from "@/hooks/ui-variant";
import { AiModelProvider } from "@/hooks/ai-model";
import { UiVariantToggle } from "@/components/ui/ui-variant-toggle";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const tr2n = localFont({
  src: "../fonts/Tr2n.ttf",
  variable: "--font-tr2n",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "Everything Converter",
  description: "Convert anything into anything",
  icons: {
    icon: "/everything-converter-favicon.png",
  },
};

export function generateStaticParams() {
  return [
    { variant: "classic" },
    { variant: "terminal" },
    { variant: "tunnel" },
    { variant: "minimal" },
    { variant: "tron" },
    { variant: "orb" },
    { variant: "raw" },
  ];
}

export default function VariantLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { variant: string };
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${tr2n.variable} ${instrumentSerif.variable} antialiased font-[family-name:var(--font-geist-mono)]`}>
        <UiVariantProvider initialVariant={params.variant as any}>
          <AiModelProvider>
            <UiVariantToggle />
            {children}
            <Toaster richColors theme="dark" position="top-right" />
          </AiModelProvider>
        </UiVariantProvider>
      </body>
    </html>
  );
}
