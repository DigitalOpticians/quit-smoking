import type { Metadata } from "next";
import "./globals.css";
import { PreferencesProvider } from "@/components/preferences";
import { ShellProvider } from "@/components/shell-context";

export const metadata: Metadata = {
  title: "Quit Smoking",
  description: "Il tuo percorso per smettere di fumare.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem("quit-smoking:appearance");if(p&&/^(light|dark):(it|en)$/.test(p)){var v=p.split(":");document.documentElement.dataset.theme=v[0];document.documentElement.lang=v[1];}}catch(e){}})();`,
          }}
        />
      </head>
      {/* Extensions may add attributes to body before React hydrates it. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <PreferencesProvider>
          <ShellProvider>{children}</ShellProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
