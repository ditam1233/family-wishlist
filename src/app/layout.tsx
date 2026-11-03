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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning className="h-full bg-stone-50 dark:bg-stone-950">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('wishlist_theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 selection:bg-stone-900 selection:text-white dark:selection:bg-stone-100 dark:selection:text-stone-950">
        {children}
      </body>
    </html>
  );
}
