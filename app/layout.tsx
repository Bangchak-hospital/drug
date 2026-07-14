import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "http://localhost:3000"),
  title: "คลังยา รพ.บางจาก | กรอบบัญชียา ปี 2569",
  description: "ระบบค้นหาและ Dashboard กรอบบัญชียา โรงพยาบาลบางจาก ปี 2569",
  openGraph: {
    title: "คลังยา รพ.บางจาก",
    description: "ค้นหากรอบบัญชียา ปี 2569 รวม 708 รายการ 12 กลุ่มยา",
    type: "website",
    locale: "th_TH",
    images: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/og.png`, width: 1536, height: 864, alt: "คลังยา โรงพยาบาลบางจาก" }],
  },
  twitter: { card: "summary_large_image", images: [`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/og.png`] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
