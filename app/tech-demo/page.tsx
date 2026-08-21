import type { Metadata } from "next";
import { TechnicalDemoPage } from "../ThermometerDashboard";

export const metadata: Metadata = {
  title: "技术交付 Demo | A股市场结构仪",
  description: "A股市场结构仪的指标公式、数据源、更新频率和技术落地说明。",
};

export default function TechDemo() {
  return <TechnicalDemoPage />;
}
