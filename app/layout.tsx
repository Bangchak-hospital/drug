import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://bangchak-hospital.github.io/drug"),
  title: "ค้นให้เจอ ก่อนเลือกใช้ | คลังยา รพ.บางจาก",
  description: "คลังยาโรงพยาบาลบางจาก พร้อมบัญชียาหลักแห่งชาติด้านสมุนไพรและข้อมูลประกอบการใช้ยา",
  openGraph: {
    title: "ค้นให้เจอ ก่อนเลือกใช้ | คลังยา รพ.บางจาก",
    description: "ค้นยา 708 รายการ และยาสมุนไพรที่โรงพยาบาลมี 35 รายการ",
    type: "website",
    locale: "th_TH",
    images: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/og-herbal.png`, width: 1730, height: 909, alt: "บัญชียาหลักแห่งชาติด้านสมุนไพร - คลังยา โรงพยาบาลบางจาก" }],
  },
  twitter: { card: "summary_large_image", images: [`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/og-herbal.png`] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
