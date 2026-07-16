import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://bangchak-hospital.github.io/drug"),
  title: "ค้นให้เจอ ก่อนเลือกใช้ | คลังยา รพ.บางจาก",
  description: "คลังยาโรงพยาบาลบางจาก ค้นยาแยกตามกลุ่มการใช้ พร้อมข้อมูลสมุนไพรและข้อมูลประกอบการใช้ยา",
  openGraph: {
    title: "ค้นให้เจอ ก่อนเลือกใช้ | คลังยา รพ.บางจาก",
    description: "ค้นยา 708 รายการ แยกตามกลุ่ม เช่น ยาคุมกำเนิด ยาเบาหวาน ยาปฏิชีวนะ และอื่น ๆ",
    type: "website",
    locale: "th_TH",
    images: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/og-groups.png`, width: 1731, height: 909, alt: "ค้นยาแยกตามกลุ่ม - คลังยา โรงพยาบาลบางจาก" }],
  },
  twitter: { card: "summary_large_image", images: [`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/og-groups.png`] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
