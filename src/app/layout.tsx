import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Семейный Вишлист",
  description: "Список подарков для семьи — делитесь желаниями, бронируйте подарки без спойлеров",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
