import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AiAssistantFloat } from "@/components/AiAssistantFloat";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Medic Dental ClíniCAS",
  description: "Sistema clínico digital de gestión dental y odontograma",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-800 antialiased">
        {children}
        <AiAssistantFloat />
      </body>
    </html>
  );
}
