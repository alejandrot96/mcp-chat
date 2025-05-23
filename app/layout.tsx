import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import localFont from 'next/font/local';

const alphaFont = localFont({
  src: [
    {
      path: '../public/font/Alpha Lyrae Medium.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/font/Alpha Lyrae Medium.woff',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const n27Font = localFont({
  src: [
    {
      path: '../public/font/n27-regular-webfont.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
  icons:{
    icon: [
      {media: '(prefers-color-scheme: dark)',
      url:("/favicon-dark.ico")},
      {media: '(prefers-color-scheme: light)',
      url:("/favicon-light.ico")}
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${alphaFont.variable} ${n27Font.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
