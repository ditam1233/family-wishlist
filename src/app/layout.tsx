import type { Metadata, Viewport } from "next";
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
        {/* 
          Dynamic SDK Loader:
          - Telegram SDK is loaded ONLY inside Telegram (VK MAX WebView blocks telegram.org).
          - MAX SDK is loaded ONLY inside MAX, and sends WebAppReady to dismiss MAX loading splash.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try{
    var h=location.hash||'';var s=location.search||'';var ua=navigator.userAgent||'';
    // Telegram Mini App
    var isTg=h.indexOf('tgWebAppData')>-1||s.indexOf('tgWebAppData')>-1||ua.indexOf('Telegram')>-1;
    if(isTg){
      var sc=document.createElement('script');
      sc.src='https://telegram.org/js/telegram-web-app.js';
      document.head.appendChild(sc);
    }
    // MAX Messenger Mini App
    var isMax=h.indexOf('WebAppData')>-1||s.indexOf('WebAppData')>-1||ua.indexOf('MAX')>-1||window.WebViewHandler;
    if(isMax){
      try{if(window.WebViewHandler&&window.WebViewHandler.postEvent){window.WebViewHandler.postEvent('WebAppReady','{}');}}catch(e){}
      try{if(window.parent&&window.parent!==window){window.parent.postMessage(JSON.stringify({type:'WebAppReady'}),'*');}}catch(e){}
      var sm=document.createElement('script');
      sm.src='https://st.max.ru/js/max-web-app.js';
      sm.onload=function(){
        try{if(window.WebApp&&window.WebApp.ready){window.WebApp.ready();}}catch(e){}
      };
      document.head.appendChild(sm);
    }
  }catch(e){}
})()`,
          }}
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
