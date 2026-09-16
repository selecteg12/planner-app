import { Manrope } from "next/font/google";
import AuthGuard from "@/components/AuthGuard";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata = {
  title: "Планер",
  description: "Календарь, задания, привычки и статистика",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <AuthGuard>
          <main className="mx-auto min-h-dvh w-full max-w-lg pb-24">
            {children}
          </main>
        </AuthGuard>
      </body>
    </html>
  );
}