import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Семейный Вишлист",
  description:
    "Список подарков для семьи — делитесь желаниями, бронируйте подарки без спойлеров",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fafaf9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full bg-stone-50">
      <body className="min-h-full flex flex-col antialiased bg-stone-50 text-stone-900 selection:bg-stone-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
