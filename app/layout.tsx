import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "http://localhost:3000"),
  title: "ค้นให้เจอ ก่อนเลือกใช้ | คลังยา รพ.บางจาก",
  description: "Digital formulary สำหรับค้นหากรอบบัญชียา โรงพยาบาลบางจาก ปี 2569",
  openGraph: {
    title: "ค้นให้เจอ ก่อนเลือกใช้ | คลังยา รพ.บางจาก",
    description: "Digital formulary ปี 2569 รวม 708 รายการ 12 กลุ่มยา",
    type: "website",
    locale: "th_TH",
    images: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/og-editorial.png`, width: 1672, height: 941, alt: "ค้นให้เจอ ก่อนเลือกใช้ - คลังยา โรงพยาบาลบางจาก" }],
  },
  twitter: { card: "summary_large_image", images: [`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/og-editorial.png`] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
