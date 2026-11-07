import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { MuiThemeProvider } from "@/components/ThemeRegistry/MuiThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Семейный Вишлист",
  description:
    "Список подарков для семьи — делитесь желаниями, бронируйте подарки без спойлеров",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Вишлист",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://st.max.ru/js/max-web-app.js"
          strategy="beforeInteractive"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                console.error('GLOBAL ERROR:', e.message, e.filename, e.lineno);
              });
              window.addEventListener('unhandledrejection', function(e) {
                console.error('UNHANDLED PROMISE:', e.reason);
              });
            `,
          }}
        />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://st.max.ru/js/max-web-app.js"
          strategy="beforeInteractive"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('wishlist_theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <MuiThemeProvider>
          {children}
        </MuiThemeProvider>
      </body>
    </html>
  );
}
