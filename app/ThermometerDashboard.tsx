"use client";

import { useEffect, useMemo, useState } from "react";

type RangeKey = "all" | "5y" | "3y" | "2y" | "1y";
type ToolKey = "marketCrowding" | "szCrowding" | "cybCrowding" | "marginBuy" | "breadth" | "turnover";
type TimeWindow = { end: number; start: number };
type MaWindow = 5 | 10 | 20 | 60;
type ScrollStep = 20 | 30 | 60 | 120;
type BreadthViewMode = "raw" | "delta";

type MetricConfig = {
  key: ToolKey;
  name: string;
  value: string;
  unit: string;
  warning: number;
  max: number;
  baselineName: string;
  volumeName: string;
  state: string;
  summary: string;
  description: string | string[];
  formula: string;
  scope: string;
  zones: Array<{ title: string; text: string }>;
  readouts: Array<{ label: string; value: string }>;
};

const rangeLabels: Record<RangeKey, string> = {
  all: "显示所有",
  "5y": "5年",
  "3y": "3年",
  "2y": "2年",
  "1y": "1年",
};

const maWindowLabels: Record<MaWindow, string> = {
  5: "5日",
  10: "10日",
  20: "20日",
  60: "60日",
};

const breadthTotalDays = 256;
const breadthEndDate = new Date(2026, 7, 19);
const oneDayMs = 24 * 60 * 60 * 1000;

const metrics: MetricConfig[] = [
  {
    key: "marketCrowding",
    name: "大盘拥挤度",
    value: "46.8%",
    unit: "%",
    warning: 50,
    max: 60,
    baselineName: "上证指数",
    volumeName: "全市场成交额",
    state: "接近警戒线",
    summary: "观察全市场成交是否集中在少数热门股票上。",
    description:
      "该指数衡量市场微观交易结构的集中程度。它统计成交额排名前5%的个股成交额占全部A股成交额的比例。数值越高，代表成交越集中在少数股票上。50%是警戒线，接近50%，预示着结构恶化，市场行情进入预警区域，或见顶，或风格发生转换。截止到2022年11月，历史上类似的情形出现过5次，市场均发生了巨大的反转，有2次市场进入牛市或维持牛市之中，且市场均发生了风格切换，分别是2008年10月和2015年1月。另三次发生了“牛转熊”现象。（引自广发策略）",
    formula: "成交额排名前5%股票成交额 / 全A成交额",
    scope: "全A，剔除上市未满60个交易日、长期停牌等无效样本",
    zones: [
      { title: "低于40%", text: "交易分布相对分散，单一热门群体对全市场成交的占比较低。" },
      { title: "40%-50%", text: "交易集中度上升，热门个股成交贡献提高，可观察是否持续接近警戒线。" },
      { title: "超过50%", text: "进入预警区间，说明成交额高度集中在少数个股上，微观交易结构偏热。" },
    ],
    readouts: [
      { label: "观察线", value: "50%" },
      { label: "距离观察线", value: "-3.2pct" },
      { label: "上证指数", value: "4,820" },
      { label: "全市场成交额", value: "3.8万亿" },
    ],
  },
  {
    key: "szCrowding",
    name: "深市拥挤度",
    value: "48.2%",
    unit: "%",
    warning: 52,
    max: 64,
    baselineName: "深证成指",
    volumeName: "深市成交额",
    state: "中等偏高",
    summary: "观察深市成交是否集中在少数高活跃股票上。",
    description:
      "衡量深市微观结构恶化的指标，即深市（含深市主板、中小板、创业板）中成交额排名前5%的个股的成交额占深市总成交额的比值。该指标接近50%时，预示着结构恶化，深市行情进入预警区域，或见顶，或风格发生转换。深市以中小市值、成长型公司为主，相较于全A股市场，深市拥挤度对成长风格切换的指示意义更强。",
    formula: "深市成交额排名前5%股票成交额 / 深市总成交额",
    scope: "深交所主板与创业板，剔除无效样本",
    zones: [
      { title: "低于42%", text: "深市成交分布较分散，热门个股的成交贡献相对有限。" },
      { title: "42%-52%", text: "深市交易热度集中度上升，需结合成交额和宽度共同观察。" },
      { title: "超过52%", text: "深市成交集中度处于较高区域，说明局部热门股票对成交贡献较大。" },
    ],
    readouts: [
      { label: "观察线", value: "52%" },
      { label: "距离观察线", value: "-3.8pct" },
      { label: "深证成指", value: "12,480" },
      { label: "深市成交额", value: "2.1万亿" },
    ],
  },
  {
    key: "cybCrowding",
    name: "创业板拥挤度",
    value: "51.6%",
    unit: "%",
    warning: 55,
    max: 68,
    baselineName: "创业板指",
    volumeName: "创业板总成交额",
    state: "接近高位",
    summary: "观察创业板成交是否集中在少数成长风格股票上。",
    description:
      "创业板拥挤度聚焦创业板股票池，衡量创业板内部成交集中程度。该指标更容易反映成长风格交易热度的局部变化。",
    formula: "创业板成交额排名前5%股票成交额 / 创业板总成交额",
    scope: "创业板股票，剔除上市未满60个交易日和长期停牌样本",
    zones: [
      { title: "低于45%", text: "创业板成交分布相对均衡，少数个股对成交额的贡献较低。" },
      { title: "45%-55%", text: "创业板交易集中度抬升，热门成长股的成交贡献提高。" },
      { title: "超过55%", text: "创业板成交集中度进入较高区域，表示局部交易热度较集中。" },
    ],
    readouts: [
      { label: "观察线", value: "55%" },
      { label: "距离观察线", value: "-3.4pct" },
      { label: "创业板指", value: "2,980" },
      { label: "创业板成交额", value: "0.84万亿" },
    ],
  },
  {
    key: "marginBuy",
    name: "融资买入/成交额",
    value: "8.74%",
    unit: "%",
    warning: 10,
    max: 14,
    baselineName: "上证指数",
    volumeName: "全市场成交额",
    state: "中等偏高",
    summary: "观察融资买入交易在全市场成交中的占比。",
    description:
      "融资买入/成交额衡量杠杆交易参与度。它统计当日融资买入额占市场成交额的比例，比例越高，说明融资买入交易对当日成交的参与程度越高。两融参与者的买卖行为（以两融余额作为表征）往往与市场表现同步，即两融余额的顶部/底部，往往对应市场的顶部/底部。但值得一提的是，融资买入占比的变动则往往同步或领先于指数的变动。这意味着，当两融余额仍在上升，但融资买入占比逐步下降时，市场可能已经进入行情后期。而这背后的原因可能是，市场出现了比两融更加“激进”的趋势交易者。（来自民生策略）",
    formula: "融资买入额 / 市场成交额",
    scope: "沪深融资融券标的汇总，按交易所披露口径模拟",
    zones: [
      { title: "低于7%", text: "融资买入参与度相对温和，杠杆交易对成交的贡献较低。" },
      { title: "7%-10%", text: "融资交易参与度上升，可与融资净买入强度一起观察。" },
      { title: "超过10%", text: "融资买入占比较高，说明杠杆资金参与成交的程度较高。" },
    ],
    readouts: [
      { label: "观察线", value: "10%" },
      { label: "距离观察线", value: "-1.26pct" },
      { label: "融资买入额", value: "3320亿" },
      { label: "融资净买入", value: "+160亿" },
    ],
  },
  {
    key: "breadth",
    name: "全市场宽度",
    value: "61.2%",
    unit: "%",
    warning: 70,
    max: 100,
    baselineName: "上证指数",
    volumeName: "全市场成交额",
    state: "覆盖面较广",
    summary: "观察上涨覆盖面，而不是只看指数涨跌。",
    description: [
      "市场宽度是衡量市场涨跌参与广度的核心指标。它统计各行业中股价站上指定均线的股票占比，用于观察行情是由多数行业共同参与，还是主要由少数板块推动。",
      "较健康的上涨行情通常伴随更多行业和个股同步走强。当大量行业板块的股票站上 MA20，说明市场上涨的覆盖面较广，内部结构相对扎实；反之，如果指数上涨但多数行业宽度回落，则说明市场上涨主要由少数板块贡献，内部扩散力度不足。",
      "该指标的核心价值在于观察行业轮动。通过热力图，可以直观看到不同行业宽度随时间的变化：颜色由蓝转暖，代表该行业站上均线的股票占比提升；颜色由暖转蓝，代表行业内部走弱。结合原始值和变化值视图，可以更清楚地识别哪些行业正在转强、哪些行业正在转弱。",
      "上方 MA 选择器支持切换 MA5、MA10、MA20、MA60。MA5、MA10 对短期变化更敏感，适合观察短线轮动；MA20、MA60 更平滑，适合观察行业中期趋势和市场整体扩散状态。",
      "全市场宽度按股票数量统计，行业等权宽度则先计算各行业宽度后再等权平均。两者口径不同，因此数值可能存在差异。",
    ],
    formula: "各申万行业内收盘价高于MA20的股票数量 / 该行业有效交易股票数量",
    scope: "申万行业板块，有效交易股票，剔除停牌和上市时间过短样本",
    zones: [
      { title: "低于30%", text: "多数行业站上MA20的股票占比较低，行业整体偏弱。" },
      { title: "30%-70%", text: "行业宽度处于中间区域，行业之间分化较明显。" },
      { title: "超过70%", text: "多数行业站上MA20的股票占比较高，市场覆盖面较广。" },
    ],
    readouts: [
      { label: "观察线", value: "70%" },
      { label: "距离观察线", value: "-8.8pct" },
      { label: "上涨家数占比", value: "58.7%" },
      { label: "新高-新低差", value: "+3.8%" },
    ],
  },
  {
    key: "turnover",
    name: "成交活跃度",
    value: "1.31x",
    unit: "x",
    warning: 1.5,
    max: 2.2,
    baselineName: "上证指数",
    volumeName: "全市场成交额",
    state: "成交放大",
    summary: "观察当日成交额相对中期均值的放大程度。",
    description:
      "成交活跃度衡量市场成交额相对自身历史均值的变化。这里用当日成交额除以120日平均成交额，帮助观察量能是否明显放大。",
    formula: "当日全市场成交额 / 过去120日平均成交额",
    scope: "全A成交额汇总，按交易日滚动计算",
    zones: [
      { title: "低于0.9x", text: "成交额低于中期均值，市场交易活跃度偏低。" },
      { title: "0.9x-1.5x", text: "成交活跃度处于常见区间，成交额相对均值温和变化。" },
      { title: "超过1.5x", text: "成交额明显高于中期均值，市场交易活跃度较高。" },
    ],
    readouts: [
      { label: "观察线", value: "1.5x" },
      { label: "距离观察线", value: "-0.19x" },
      { label: "当日成交额", value: "3.8万亿" },
      { label: "120日均额", value: "2.9万亿" },
    ],
  },
];

const palette: Record<ToolKey, { line: string; fill: string }> = {
  marketCrowding: { line: "#2f73df", fill: "#2f73df" },
  szCrowding: { line: "#1f8a70", fill: "#1f8a70" },
  cybCrowding: { line: "#7b61d1", fill: "#7b61d1" },
  marginBuy: { line: "#c87913", fill: "#c87913" },
  breadth: { line: "#2e9d55", fill: "#2e9d55" },
  turnover: { line: "#1f77a8", fill: "#1f77a8" },
};

const styleGroups = [
  { color: "#8e5bd1", group: "金融/公用", industries: ["公用事业", "交通运输", "房地产", "银行", "非银金融", "综合", "环保"] },
  { color: "#ef5a64", group: "医药", industries: ["化学制药", "中药", "医疗器械", "医疗服务", "生物制品"] },
  { color: "#62a66f", group: "制造/新能源", industries: ["汽车", "建筑材料", "建筑装饰", "电力设备", "机械设备", "国防军工"] },
  { color: "#e3a93e", group: "周期/资源", industries: ["农林牧渔", "基础化工", "钢铁", "有色金属", "煤炭", "石油石化"] },
  { color: "#ff7d4f", group: "消费", industries: ["家用电器", "食品饮料", "纺织服饰", "轻工制造", "商贸零售", "社会服务", "美容护理"] },
  { color: "#5b78d6", group: "科技/TMT", industries: ["电子", "计算机", "通信", "传媒"] },
];

function isCrowdingMetric(metric: MetricConfig) {
  return metric.key === "marketCrowding" || metric.key === "szCrowding" || metric.key === "cybCrowding";
}

function buildSeries(metric: MetricConfig, points = isCrowdingMetric(metric) ? 520 : 150) {
  return Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1);
    const crowding = isCrowdingMetric(metric);
    const cycle = Math.sin(progress * Math.PI * (crowding ? 13 : 7)) * metric.max * (crowding ? 0.075 : 0.06);
    const local = Math.sin(progress * Math.PI * (crowding ? 71 : 23)) * metric.max * (crowding ? 0.045 : 0.035);
    const microNoise = crowding
      ? (Math.sin(index * 1.73) + Math.sin(index * 0.47 + 1.6) * 0.65 + Math.sin(index * 3.11) * 0.35) * metric.max * 0.018
      : 0;
    const crowdingSpike = crowding
      ? [0.12, 0.18, 0.27, 0.33, 0.49, 0.58, 0.67, 0.78, 0.88, 0.96].reduce((sum, center, spikeIndex) => {
          const width = spikeIndex % 3 === 0 ? 0.012 : 0.018;
          const height = metric.max * (0.055 + (spikeIndex % 4) * 0.018);
          return sum + Math.exp(-Math.pow((progress - center) / width, 2)) * height;
        }, 0)
      : 0;
    const spike =
      Math.exp(-Math.pow((progress - 0.25) / 0.03, 2)) * metric.max * 0.27 +
      Math.exp(-Math.pow((progress - 0.62) / 0.045, 2)) * metric.max * 0.15 +
      Math.exp(-Math.pow((progress - 0.96) / 0.03, 2)) * metric.max * 0.1;
    const base = metric.warning * 0.68 + progress * metric.max * 0.12;
    const metricValue = Math.max(metric.max * 0.12, Math.min(metric.max * 0.98, base + cycle + local + microNoise + spike + crowdingSpike));
    const indexLine =
      2300 +
      progress * 2100 +
      Math.sin(progress * Math.PI * 5.5) * 310 +
      Math.exp(-Math.pow((progress - 0.25) / 0.035, 2)) * 1450 -
      Math.exp(-Math.pow((progress - 0.48) / 0.045, 2)) * 520;
    const volume =
      0.32 +
      progress * 1.45 +
      Math.max(0, Math.sin(progress * Math.PI * 9)) * 0.45 +
      Math.exp(-Math.pow((progress - 0.25) / 0.028, 2)) * 1.45 +
      Math.exp(-Math.pow((progress - 0.96) / 0.03, 2)) * 1.25;
    return {
      x: progress,
      metric: metricValue,
      index: Math.max(1500, Math.min(6200, indexLine)),
      volume: Math.min(4.2, volume),
    };
  });
}

function linePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function areaPath(points: Array<{ x: number; y: number }>, bottom: number) {
  return `${linePath(points)} L ${points[points.length - 1].x.toFixed(1)} ${bottom} L ${points[0].x.toFixed(1)} ${bottom} Z`;
}

function rangeStart(range: RangeKey) {
  if (range === "all") return 0;
  return { "5y": 0.45, "3y": 0.62, "2y": 0.74, "1y": 0.86 }[range];
}

function windowFromRange(range: RangeKey): TimeWindow {
  return { start: Math.round(rangeStart(range) * 100), end: 100 };
}

function defaultBreadthWindow(): TimeWindow {
  return { start: 75, end: 100 };
}

function yearLabel(percent: number) {
  const startYear = 2011;
  const startMonth = 9;
  const endYear = 2026;
  const endMonth = 8;
  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
  const monthOffset = Math.round(totalMonths * (percent / 100));
  const absoluteMonth = startMonth + monthOffset;
  const year = startYear + Math.floor((absoluteMonth - 1) / 12);
  const month = ((absoluteMonth - 1) % 12) + 1;
  return `${year}/${month}`;
}

function recentDateLabel(percent: number) {
  const daysBeforeEnd = Math.round(breadthTotalDays * (1 - percent / 100));
  const date = new Date(breadthEndDate);
  date.setDate(breadthEndDate.getDate() - daysBeforeEnd);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function isoDateFromPercent(percent: number) {
  const daysBeforeEnd = Math.round(breadthTotalDays * (1 - percent / 100));
  const date = new Date(breadthEndDate);
  date.setDate(breadthEndDate.getDate() - daysBeforeEnd);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function percentFromIsoDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 100;
  const daysBeforeEnd = Math.round((breadthEndDate.getTime() - parsed.getTime()) / oneDayMs);
  return Math.max(0, Math.min(100, Math.round(100 - (daysBeforeEnd / breadthTotalDays) * 100)));
}

function breadthColor(value: number) {
  if (value >= 50) {
    const alpha = 0.2 + ((value - 50) / 50) * 0.68;
    return `rgba(218, 63, 58, ${alpha.toFixed(2)})`;
  }
  const alpha = 0.18 + ((50 - value) / 50) * 0.68;
  return `rgba(52, 112, 190, ${alpha.toFixed(2)})`;
}

function breadthToneColor(value: number) {
  const stops = [
    { color: [13, 71, 161], value: 0 },
    { color: [0, 122, 255], value: 18 },
    { color: [100, 181, 246], value: 30 },
    { color: [174, 213, 129], value: 45 },
    { color: [255, 204, 0], value: 58 },
    { color: [255, 149, 0], value: 70 },
    { color: [255, 99, 71], value: 82 },
    { color: [255, 59, 48], value: 92 },
    { color: [162, 20, 47], value: 100 },
  ];
  const bounded = Math.max(0, Math.min(100, value));
  const upperIndex = stops.findIndex((stop) => bounded <= stop.value);
  const upper = stops[Math.max(upperIndex, 1)];
  const lower = stops[Math.max(upperIndex - 1, 0)];
  const ratio = (bounded - lower.value) / Math.max(upper.value - lower.value, 1);
  const channel = (index: number) => Math.round(lower.color[index] + (upper.color[index] - lower.color[index]) * ratio);

  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

function breadthToneBackground(value: number) {
  return breadthToneColor(value).replace("rgb(", "rgb(").replace(")", " / 0.1)");
}

function deltaColor(delta: number) {
  if (delta > 0) {
    const alpha = 0.16 + Math.min(Math.abs(delta), 24) / 24 * 0.68;
    return `rgba(218, 63, 58, ${alpha.toFixed(2)})`;
  }
  if (delta < 0) {
    const alpha = 0.16 + Math.min(Math.abs(delta), 24) / 24 * 0.68;
    return `rgba(38, 126, 132, ${alpha.toFixed(2)})`;
  }
  return "rgba(226, 231, 237, 0.88)";
}

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function styleValue(groupIndex: number, industryIndex: number, column: number, columns: number, start: number, end: number) {
  const progress = start / 100 + ((end - start) / 100) * (column / Math.max(columns - 1, 1));
  const groupBias = Math.sin((groupIndex + 1) * 1.35) * 15;
  const industryBias = Math.cos((industryIndex + 2) * 1.1) * 12;
  const cycle = Math.sin(progress * Math.PI * 6.2 + groupIndex * 0.8 + industryIndex * 0.3) * 24;
  const lateStyleLift = progress > 0.7 && (groupIndex === 0 || groupIndex === 1) ? (progress - 0.7) * 100 : 0;
  const techFade = progress > 0.58 && groupIndex === 5 ? -(progress - 0.58) * 70 : 0;
  return Math.max(6, Math.min(96, Math.round(38 + groupBias + industryBias + cycle + lateStyleLift + techFade)));
}

function marketBreadthValue(groupIndex: number, industryIndex: number, column: number, columns: number, start: number, end: number, maWindow: MaWindow) {
  const raw = styleValue(groupIndex, industryIndex, column, columns, start, end);
  const windowAdjustment = { 5: 12, 10: 7, 20: 0, 60: -8 }[maWindow];
  return Math.max(6, Math.min(96, Math.round(raw + windowAdjustment)));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function latestStyleExtremes(timeWindow: TimeWindow, maWindow: MaWindow) {
  return styleGroups.map((group, groupIndex) => {
    const values = group.industries.map((industry, industryIndex) => ({
      industry,
      value: marketBreadthValue(groupIndex, industryIndex, 29, 30, timeWindow.start, timeWindow.end, maWindow),
    }));
    const weakest = [...values].sort((a, b) => a.value - b.value)[0];
    const strongest = [...values].sort((a, b) => b.value - a.value)[0];
    return { ...group, strongest, weakest };
  });
}

function TimeSliderControl({
  timeWindow,
  onTimeWindowChange,
  labelFormatter = yearLabel,
}: {
  timeWindow: TimeWindow;
  onTimeWindowChange: (window: TimeWindow) => void;
  labelFormatter?: (percent: number) => string;
}) {
  const rangeStartLabel = labelFormatter(timeWindow.start);
  const rangeEndLabel = labelFormatter(timeWindow.end);
  const updateStart = (value: string) => {
    const nextStart = Math.min(Number(value), timeWindow.end - 8);
    onTimeWindowChange({ start: nextStart, end: timeWindow.end });
  };
  const updateEnd = (value: string) => {
    const nextEnd = Math.max(Number(value), timeWindow.start + 8);
    onTimeWindowChange({ start: timeWindow.start, end: nextEnd });
  };

  return (
    <div className="time-slider" aria-label="时间范围拖动滑块">
      <div className="time-slider-labels">
        <span>{rangeStartLabel}</span>
        <strong>拖动两端缩放时间范围</strong>
        <span>{rangeEndLabel}</span>
      </div>
      <div className="time-slider-track" style={{ "--start": timeWindow.start, "--end": timeWindow.end } as React.CSSProperties}>
        <input
          aria-label="开始时间"
          max="99"
          min="0"
          onChange={(event) => {
            updateStart(event.target.value);
          }}
          onInput={(event) => {
            updateStart(event.currentTarget.value);
          }}
          type="range"
          value={timeWindow.start}
        />
        <input
          aria-label="结束时间"
          max="100"
          min="1"
          onChange={(event) => {
            updateEnd(event.target.value);
          }}
          onInput={(event) => {
            updateEnd(event.currentTarget.value);
          }}
          type="range"
          value={timeWindow.end}
        />
      </div>
    </div>
  );
}

function StructureRadar() {
  const axes = [
    { label: "宽度", value: 61 },
    { label: "拥挤", value: 94 },
    { label: "杠杆", value: 62 },
    { label: "活跃", value: 58 },
  ];
  const center = 76;
  const radius = 48;
  const pointFor = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes.length;
    const distance = radius * (value / 100);
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };
  const ringPoints = (scale: number) =>
    axes
      .map((_, index) => {
        const point = pointFor(index, scale);
        return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      })
      .join(" ");
  const shapePoints = axes.map((axis, index) => {
    const point = pointFor(index, axis.value);
    return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }).join(" ");
  const zonePoints = [92, 70, 48].map((scale) => ringPoints(scale));

  return (
    <div className="structure-radar-card" aria-label="结构画像雷达图">
      <div className="radar-heading">
        <span>结构画像</span>
        <strong>68</strong>
      </div>
      <svg className="structure-radar" viewBox="0 0 152 152" role="img" aria-label="宽度、拥挤、杠杆、活跃四维结构画像">
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="45%" r="62%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
            <stop offset="58%" stopColor="#eaf3ff" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#d9e9ff" stopOpacity="0.42" />
          </radialGradient>
          <linearGradient id="radarShapeGradient" x1="22%" x2="86%" y1="18%" y2="88%">
            <stop offset="0%" stopColor="#0b76de" stopOpacity="0.2" />
            <stop offset="46%" stopColor="#2f9f78" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#e85c5c" stopOpacity="0.28" />
          </linearGradient>
          <filter id="radarSoftGlow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle className="radar-backdrop" cx={center} cy={center} r="62" />
        {zonePoints.map((points, index) => (
          <polygon className={`radar-zone zone-${index + 1}`} key={points} points={points} />
        ))}
        {[20, 40, 60, 80, 100].map((scale) => (
          <polygon className="radar-ring" key={scale} points={ringPoints(scale)} />
        ))}
        {axes.map((axis, index) => {
          const end = pointFor(index, 100);
          const valuePoint = pointFor(index, axis.value);
          return (
            <g key={axis.label}>
              <line className="radar-axis" x1={center} x2={end.x} y1={center} y2={end.y} />
              <circle className="radar-dot" cx={valuePoint.x} cy={valuePoint.y} r="3" />
              <text
                className="radar-label"
                dy={index === 0 ? "-8" : index === 2 ? "14" : "4"}
                x={end.x}
                y={end.y}
                textAnchor={index === 1 ? "start" : index === 3 ? "end" : "middle"}
              >
                {axis.label}
              </text>
            </g>
          );
        })}
        <polygon className="radar-shape-glow" points={shapePoints} />
        <polygon className="radar-shape" points={shapePoints} />
        <text className="radar-core-score" x={center} y={center + 5} textAnchor="middle">68</text>
      </svg>
      <em>0-100 · 客观合成</em>
    </div>
  );
}

function BreadthControlPanel({
  maWindow,
  timeWindow,
  onMaWindowChange,
  onTimeWindowChange,
}: {
  maWindow: MaWindow;
  timeWindow: TimeWindow;
  onMaWindowChange: (window: MaWindow) => void;
  onTimeWindowChange: (window: TimeWindow) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [scrollStep, setScrollStep] = useState<ScrollStep>(20);
  const [draftStart, setDraftStart] = useState(isoDateFromPercent(timeWindow.start));
  const [draftEnd, setDraftEnd] = useState(isoDateFromPercent(timeWindow.end));
  const rangeText = `${isoDateFromPercent(timeWindow.start)} - ${isoDateFromPercent(timeWindow.end)}`;
  const shiftWindow = (days: number) => {
    const span = timeWindow.end - timeWindow.start;
    const delta = (days / breadthTotalDays) * 100;
    const nextStart = Math.max(0, Math.min(100 - span, timeWindow.start + delta));
    onTimeWindowChange({ start: Math.round(nextStart), end: Math.round(nextStart + span) });
  };
  const returnLatest = () => {
    const span = timeWindow.end - timeWindow.start;
    onTimeWindowChange({ start: Math.round(100 - span), end: 100 });
  };
  const applyDateRange = () => {
    const start = percentFromIsoDate(draftStart);
    const end = percentFromIsoDate(draftEnd);
    const nextStart = Math.min(start, end - 8);
    const nextEnd = Math.max(end, start + 8);
    onTimeWindowChange({ start: Math.max(0, nextStart), end: Math.min(100, nextEnd) });
    setCalendarOpen(false);
  };

  useEffect(() => {
    setDraftStart(isoDateFromPercent(timeWindow.start));
    setDraftEnd(isoDateFromPercent(timeWindow.end));
  }, [timeWindow.start, timeWindow.end]);

  return (
    <section className="breadth-control-panel" aria-label="市场宽度时间筛选">
      <div className="breadth-control-top">
        <div className="date-range-box">
          <span>日期区间</span>
          <button className="date-range-trigger" onClick={() => setCalendarOpen((open) => !open)} type="button">
            {rangeText}
          </button>
          {calendarOpen ? (
            <div className="calendar-popover" role="dialog" aria-label="日期区间选择">
              <div className="calendar-head">
                <strong>八月 2026</strong>
                <span>选择开始与结束日期</span>
              </div>
              <div className="date-input-grid">
                <label>
                  <span>开始日期</span>
                  <input max="2026-08-19" min="2025-12-06" onChange={(event) => setDraftStart(event.target.value)} type="date" value={draftStart} />
                </label>
                <label>
                  <span>结束日期</span>
                  <input max="2026-08-19" min="2025-12-06" onChange={(event) => setDraftEnd(event.target.value)} type="date" value={draftEnd} />
                </label>
              </div>
              <div className="calendar-actions">
                <button onClick={() => setCalendarOpen(false)} type="button">取消</button>
                <button className="primary" onClick={applyDateRange} type="button">应用区间</button>
              </div>
            </div>
          ) : null}
        </div>
        <label className="ma-select">
          <span>MA类型</span>
          <select value={maWindow} onChange={(event) => onMaWindowChange(Number(event.target.value) as MaWindow)}>
            {([5, 10, 20, 60] as MaWindow[]).map((item) => (
              <option key={item} value={item}>MA{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="breadth-control-actions">
        <div className="window-step-control">
          <span>查看窗口</span>
          <div className="segmented chart-range day-radio" aria-label="查看窗口">
            {([20, 30, 60, 120] as ScrollStep[]).map((item) => (
              <button className={scrollStep === item ? "active" : ""} key={item} onClick={() => setScrollStep(item)} type="button">
                {item}日
              </button>
            ))}
          </div>
        </div>
        <div className="browse-control">
          <span>浏览</span>
          <div className="scroll-buttons">
            <button onClick={() => shiftWindow(-scrollStep)} type="button">前移{scrollStep}日</button>
            <button onClick={() => shiftWindow(scrollStep)} type="button">后移{scrollStep}日</button>
            <button className="latest" onClick={returnLatest} type="button">返回最新</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StyleExtremePanel({ maWindow, timeWindow }: { maWindow: MaWindow; timeWindow: TimeWindow }) {
  const extremes = latestStyleExtremes(timeWindow, maWindow);
  const widest = [...extremes].sort((a, b) => b.strongest.value - a.strongest.value)[0];
  const narrowest = [...extremes].sort((a, b) => a.weakest.value - b.weakest.value)[0];

  return (
    <section className="style-extreme-panel" aria-label="风格极值面板">
      <div className="style-panel-title">
        <strong>风格极值面板</strong>
        <span>{recentDateLabel(timeWindow.end)} · {maWindowLabels[maWindow]}</span>
      </div>
      <p className="style-panel-help">
        展示各风格组内市场宽度最低与最高的二级行业。圆点越靠右，代表站上所选 MA 的股票占比越高；颜色随数值由冷到暖、由浅到深变化。
      </p>
      <div className="extreme-rows">
        {extremes.map((group) => (
          <div className="extreme-row" key={group.group}>
            <div className="extreme-left">
              <span>{group.group}</span>
              <strong>{group.weakest.industry}</strong>
              <em style={{ background: breadthToneBackground(group.weakest.value), color: breadthToneColor(group.weakest.value) }}>{group.weakest.value}%</em>
            </div>
            <div className="extreme-scale">
              <i style={{ left: `${group.weakest.value}%`, borderColor: breadthToneColor(group.weakest.value) }} />
              <b />
              <i style={{ left: `${group.strongest.value}%`, borderColor: breadthToneColor(group.strongest.value) }} />
            </div>
            <div className="extreme-right">
              <em style={{ background: breadthToneBackground(group.strongest.value), color: breadthToneColor(group.strongest.value) }}>{group.strongest.value}%</em>
              <strong>{group.strongest.industry}</strong>
            </div>
          </div>
        ))}
      </div>
      <p>
        当前样本中，{widest.strongest.industry}为{widest.group}组内宽度最高，{narrowest.weakest.industry}为{narrowest.group}组内宽度最低。该面板仅展示风格组内部宽度分布。
      </p>
    </section>
  );
}

function BreadthTrendPanel({ dates, marketAverageValues, timeWindow }: { dates: string[]; marketAverageValues: number[]; timeWindow: TimeWindow }) {
  const [activeIndex, setActiveIndex] = useState(marketAverageValues.length - 1);
  const width = 1000;
  const topChartTop = 28;
  const topChartBottom = 208;
  const bottomChartTop = 268;
  const bottomChartBottom = 430;
  const trendBreadthValues = marketAverageValues.map((value, index) => {
    const progress = timeWindow.start / 100 + ((timeWindow.end - timeWindow.start) / 100) * (index / Math.max(marketAverageValues.length - 1, 1));
    const wave = Math.sin(index * 0.72) * 9 + Math.sin(index * 1.85 + 0.4) * 5 + Math.cos(progress * Math.PI * 9) * 7;
    const shock =
      Math.exp(-Math.pow((index - 6) / 1.8, 2)) * -13 +
      Math.exp(-Math.pow((index - 12) / 2.1, 2)) * 17 +
      Math.exp(-Math.pow((index - 19) / 1.7, 2)) * -16 +
      Math.exp(-Math.pow((index - 25) / 1.6, 2)) * 18;
    return Math.max(8, Math.min(92, Math.round(value + wave + shock)));
  });
  const indexValues = trendBreadthValues.map((value, index) => {
    const progress = index / Math.max(trendBreadthValues.length - 1, 1);
    const downTrend = -260 * progress;
    const swing = Math.sin(index * 0.55 + 0.7) * 95 + Math.sin(index * 1.37) * 42;
    const rebound =
      Math.exp(-Math.pow((index - 4) / 1.5, 2)) * 95 +
      Math.exp(-Math.pow((index - 11) / 2.2, 2)) * 170 -
      Math.exp(-Math.pow((index - 18) / 2.0, 2)) * 185 +
      Math.exp(-Math.pow((index - 24) / 1.5, 2)) * 120;
    const breadthPulse = (value - 50) * 4.5;
    return Math.round(4070 + downTrend + swing + rebound + breadthPulse);
  });
  const minIndex = Math.min(...indexValues) - 40;
  const maxIndex = Math.max(...indexValues) + 40;
  const xFor = (index: number) => (index / Math.max(marketAverageValues.length - 1, 1)) * width;
  const yIndex = (value: number) => topChartBottom - ((value - minIndex) / Math.max(maxIndex - minIndex, 1)) * (topChartBottom - topChartTop);
  const yBreadth = (value: number) => bottomChartBottom - (value / 100) * (bottomChartBottom - bottomChartTop);
  const indexPoints = indexValues.map((value, index) => ({ x: xFor(index), y: yIndex(value) }));
  const breadthPoints = trendBreadthValues.map((value, index) => ({ x: xFor(index), y: yBreadth(value) }));
  const indexPath = linePath(indexPoints);
  const breadthPath = linePath(breadthPoints);
  const indexArea = areaPath(indexPoints, topChartBottom);
  const breadthArea = areaPath(breadthPoints, bottomChartBottom);
  const activeX = xFor(activeIndex);
  const activeIndexY = yIndex(indexValues[activeIndex]);
  const activeBreadthY = yBreadth(trendBreadthValues[activeIndex]);
  const tooltipX = Math.min(Math.max(activeX + 24, 620), 820);
  const handleMove = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    const next = Math.round(((clientX - rect.left) / rect.width) * (marketAverageValues.length - 1));
    setActiveIndex(Math.max(0, Math.min(marketAverageValues.length - 1, next)));
  };

  return (
    <section className="breadth-trend-panel" aria-label="行情与趋势对比">
      <div className="trend-title">
        <div>
          <strong>行情与趋势对比</strong>
          <span>上证指数与行业等权宽度</span>
        </div>
        <div className="chart-legend">
          <span><i className="legend-dot red" />上证指数</span>
          <span><i className="legend-dot trend-blue" />行业等权宽度</span>
        </div>
      </div>
      <svg
        className="breadth-trend-chart"
        viewBox={`0 0 ${width} 460`}
        role="img"
        aria-label="上证指数与行业等权宽度趋势对比"
        onMouseMove={(event) => handleMove(event.clientX, event.currentTarget)}
        onTouchMove={(event) => {
          if (event.touches[0]) handleMove(event.touches[0].clientX, event.currentTarget);
        }}
      >
        <defs>
          <linearGradient id="trendIndexArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="trendBreadthArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5b7ee5" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#5b7ee5" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = topChartTop + tick * (topChartBottom - topChartTop);
          return <line className="grid-line faint" key={`top-${tick}`} x1="40" x2={width - 24} y1={y} y2={y} />;
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = bottomChartTop + tick * (bottomChartBottom - bottomChartTop);
          return <line className="grid-line faint" key={`bottom-${tick}`} x1="40" x2={width - 24} y1={y} y2={y} />;
        })}
        <text className="trend-axis-label red" x="14" y="22">上证指数</text>
        <text className="trend-axis-label blue" x="14" y="258">行业等权宽度</text>
        <path className="trend-area" d={indexArea} fill="url(#trendIndexArea)" />
        <path className="trend-line index" d={indexPath} />
        <path className="trend-area" d={breadthArea} fill="url(#trendBreadthArea)" />
        <path className="trend-line breadth" d={breadthPath} />
        {[0, 5, 10, 15, 20, 25, 29].map((index) => (
          <text className="trend-date" key={dates[index]} x={xFor(index)} y="452" textAnchor={index === 0 ? "start" : index === 29 ? "end" : "middle"}>
            {dates[index].slice(5).replace("/", "-")}
          </text>
        ))}
        <line className="trend-crosshair" x1={activeX} x2={activeX} y1={topChartTop} y2={bottomChartBottom} />
        <circle className="trend-point index" cx={activeX} cy={activeIndexY} r="4.5" />
        <circle className="trend-point breadth" cx={activeX} cy={activeBreadthY} r="4.5" />
        <g className="trend-tooltip" transform={`translate(${tooltipX} 122)`}>
          <rect height="108" rx="8" width="170" />
          <text className="tooltip-date" x="18" y="30">{dates[activeIndex].replaceAll("/", "-")}</text>
          <circle cx="22" cy="58" r="5" fill="#ff6b6b" />
          <text x="36" y="64">上证指数</text>
          <text className="tooltip-value" x="148" y="64">{indexValues[activeIndex]}</text>
          <circle cx="22" cy="88" r="5" fill="#5b7ee5" />
          <text x="36" y="94">行业等权</text>
          <text className="tooltip-value" x="148" y="94">{trendBreadthValues[activeIndex]}</text>
        </g>
      </svg>
    </section>
  );
}

function BreadthHeatmap({
  metric,
  maWindow,
  timeWindow,
  onTimeWindowChange,
}: {
  metric: MetricConfig;
  maWindow: MaWindow;
  timeWindow: TimeWindow;
  onTimeWindowChange: (window: TimeWindow) => void;
}) {
  const columns = 30;
  const [breadthViewMode, setBreadthViewMode] = useState<BreadthViewMode>("raw");
  const dateTicks = Array.from({ length: columns }, (_, index) => {
    const pct = timeWindow.start + (timeWindow.end - timeWindow.start) * (index / Math.max(columns - 1, 1));
    return recentDateLabel(pct);
  });
  const industryRows = styleGroups.flatMap((group, groupIndex) =>
    group.industries.map((industry, industryIndex) => ({
      color: group.color,
      group: group.group,
      groupIndex,
      industry,
      industryIndex,
    })),
  );
  const valueFor = (groupIndex: number, industryIndex: number, column: number) =>
    marketBreadthValue(groupIndex, industryIndex, column, columns, timeWindow.start, timeWindow.end, maWindow);
  const marketAverageValues = Array.from({ length: columns }, (_, column) =>
    average(industryRows.map((row) => valueFor(row.groupIndex, row.industryIndex, column))),
  );
  const changeRanks = industryRows
    .map((row) => {
      const value = valueFor(row.groupIndex, row.industryIndex, columns - 1);
      const previous = valueFor(row.groupIndex, row.industryIndex, columns - 2);
      return { ...row, delta: value - previous, value };
    })
    .sort((a, b) => b.delta - a.delta);
  const gainers = changeRanks.filter((row) => row.delta > 0).slice(0, 10);
  const losers = [...changeRanks].filter((row) => row.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 10);
  const renderCell = (value: number, previous: number | null, key: string, label: string, columnIndex: number, className = "") => {
    const delta = previous === null ? 0 : value - previous;
    const visibleValue = breadthViewMode === "raw" ? `${value}` : formatDelta(delta);
    const background = breadthViewMode === "raw" ? breadthColor(value) : deltaColor(delta);
    const titleSuffix = breadthViewMode === "raw" ? `${value}%` : `${formatDelta(delta)}pct，当前${value}%`;

    return (
      <div
        className={`heatmap-cell ${className} ${breadthViewMode === "delta" ? "delta" : ""}`}
        key={key}
        style={{ background }}
        title={`${label} ${dateTicks[columnIndex]}：${titleSuffix}`}
      >
        {visibleValue}
      </div>
    );
  };

  return (
    <div className="chart-card">
      <StyleExtremePanel maWindow={maWindow} timeWindow={timeWindow} />
      <div className="chart-toolbar">
        <div className="chart-legend" aria-label="图例">
          {breadthViewMode === "raw" ? (
            <>
              <span><i className="legend-dot heat-red" />较高宽度</span>
              <span><i className="legend-dot heat-blue" />较低宽度</span>
            </>
          ) : (
            <>
              <span><i className="legend-dot heat-red" />走强</span>
              <span><i className="legend-dot heat-teal" />走弱</span>
              <span>每格 = 最近1日MA均值 - 此前1日MA均值</span>
            </>
          )}
        </div>
        <div className="breadth-toolbar-controls">
          <div className="segmented chart-range" aria-label={`${metric.name}数据视图`}>
            {([
              ["raw", "原始值"],
              ["delta", "变化值"],
            ] as Array<[BreadthViewMode, string]>).map(([mode, label]) => (
              <button className={breadthViewMode === mode ? "active" : ""} key={mode} onClick={() => setBreadthViewMode(mode)} type="button">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {breadthViewMode === "delta" ? (
        <div className="breadth-change-panel" aria-label="市场宽度变化榜">
          <div className="change-section">
            <strong>走强（{gainers.length}个行业）</strong>
            <div>
              {gainers.map((row) => (
                <span className="change-chip positive" key={`${row.group}-${row.industry}`}>
                  <b>{row.industry}</b>
                  <em>{formatDelta(row.delta)}</em>
                  <i>{row.value}%</i>
                </span>
              ))}
            </div>
          </div>
          <div className="change-section">
            <strong>走弱（{losers.length}个行业）</strong>
            <div>
              {losers.map((row) => (
                <span className="change-chip negative" key={`${row.group}-${row.industry}`}>
                  <b>{row.industry}</b>
                  <em>{formatDelta(row.delta)}</em>
                  <i>{row.value}%</i>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <div className="heatmap-scroll no-inner-scroll">
        <div className="breadth-heatmap" style={{ "--columns": columns } as React.CSSProperties}>
          <div className="heatmap-corner">行业</div>
          {dateTicks.map((date, index) => (
            <div className="heatmap-date" key={`${date}-${index}`}>{index % 5 === 0 || index === columns - 1 ? date : ""}</div>
          ))}
          <div className="heatmap-row">
            <div className="heatmap-market-label">市场平均</div>
            {marketAverageValues.map((value, columnIndex) =>
              renderCell(value, columnIndex === 0 ? null : marketAverageValues[columnIndex - 1], `market-${columnIndex}`, "市场平均", columnIndex, "market-average"),
            )}
          </div>
          {styleGroups.map((group, groupIndex) => {
            const groupAverageValues = Array.from({ length: columns }, (_, column) =>
              average(group.industries.map((_, industryIndex) => valueFor(groupIndex, industryIndex, column))),
            );

            return (
              <div className="heatmap-group" key={group.group}>
                <div className="heatmap-group-name" style={{ color: group.color }}>▸ {group.group}</div>
                <div className="heatmap-row">
                  <div className="heatmap-average-label" style={{ color: group.color }}>{group.group}均值</div>
                  {groupAverageValues.map((value, columnIndex) =>
                    renderCell(value, columnIndex === 0 ? null : groupAverageValues[columnIndex - 1], `${group.group}-avg-${columnIndex}`, `${group.group}均值`, columnIndex, "average"),
                  )}
                </div>
                {group.industries.map((industry, industryIndex) => (
                  <div className="heatmap-row" key={`${group.group}-${industry}`}>
                    <div className="heatmap-industry">{industry}</div>
                    {Array.from({ length: columns }, (_, columnIndex) => {
                      const value = valueFor(groupIndex, industryIndex, columnIndex);
                      const previous = columnIndex === 0 ? null : valueFor(groupIndex, industryIndex, columnIndex - 1);
                      return renderCell(value, previous, `${group.group}-${industry}-${columnIndex}`, industry, columnIndex);
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <BreadthTrendPanel dates={dateTicks} marketAverageValues={marketAverageValues} timeWindow={timeWindow} />
      <div className="chart-readout">
        {[
          { label: "MA周期", value: maWindowLabels[maWindow] },
          ...metric.readouts.slice(1),
        ].map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chart({
  metric,
  range,
  timeWindow,
  maWindow,
  onRangeChange,
  onMaWindowChange,
  onTimeWindowChange,
}: {
  metric: MetricConfig;
  range: RangeKey;
  timeWindow: TimeWindow;
  maWindow: MaWindow;
  onRangeChange: (range: RangeKey) => void;
  onMaWindowChange: (window: MaWindow) => void;
  onTimeWindowChange: (window: TimeWindow) => void;
}) {
  const raw = useMemo(() => buildSeries(metric), [metric]);
  const visible = raw.filter((point) => point.x >= timeWindow.start / 100 && point.x <= timeWindow.end / 100);
  const series = visible.length > 2 ? visible : raw;
  const color = palette[metric.key];

  const width = 1000;
  const priceTop = 22;
  const priceBottom = 392;
  const volumeTop = 448;
  const volumeBottom = 585;

  const chartPoints = series.map((point, index) => {
    const x = (index / (series.length - 1)) * width;
    return {
      x,
      metricY: priceBottom - (point.metric / metric.max) * (priceBottom - priceTop),
      indexY: priceBottom - ((point.index - 1500) / 4700) * (priceBottom - priceTop),
      volumeY: volumeBottom - (point.volume / 4.2) * (volumeBottom - volumeTop),
    };
  });

  const metricPath = linePath(chartPoints.map((point) => ({ x: point.x, y: point.metricY })));
  const indexPath = linePath(chartPoints.map((point) => ({ x: point.x, y: point.indexY })));
  const volumePath = areaPath(chartPoints.map((point) => ({ x: point.x, y: point.volumeY })), volumeBottom);
  const warningY = priceBottom - (metric.warning / metric.max) * (priceBottom - priceTop);

  if (metric.key === "breadth") {
    return (
      <BreadthHeatmap
        metric={metric}
        maWindow={maWindow}
        onTimeWindowChange={onTimeWindowChange}
        timeWindow={timeWindow}
      />
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-toolbar">
        <div className="chart-legend" aria-label="图例">
          <span><i className="legend-dot dynamic" style={{ background: color.line }} />{metric.name}</span>
          <span><i className="legend-dot red" />{metric.baselineName}</span>
          <span><i className="legend-dot tan" />{metric.volumeName}</span>
          <span><i className="legend-line" />观察线</span>
        </div>
        <div className="segmented chart-range" aria-label={`${metric.name}历史区间`}>
          {(Object.keys(rangeLabels) as RangeKey[]).map((item) => (
            <button className={range === item ? "active" : ""} key={item} onClick={() => onRangeChange(item)} type="button">
              {rangeLabels[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-scroll">
        <svg className="market-chart" viewBox={`0 0 ${width} 620`} role="img" aria-label={`${metric.name}、${metric.baselineName}和${metric.volumeName}模拟曲线`}>
          <defs>
            <linearGradient id={`metricGradient-${metric.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color.fill} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color.fill} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((tick) => {
            const value = metric.max * tick;
            const y = priceBottom - tick * (priceBottom - priceTop);
            const label = metric.unit === "x" ? `${value.toFixed(1)}x` : `${Math.round(value)}%`;
            return (
              <g key={tick}>
                <line className="grid-line" x1="0" x2={width} y1={y} y2={y} />
                <text className="axis-text" x="0" y={y - 5}>{label}</text>
              </g>
            );
          })}
          {[1500, 2000, 3000, 4000, 5000, 6000].map((tick) => {
            const y = priceBottom - ((tick - 1500) / 4700) * (priceBottom - priceTop);
            return <text className="axis-text right" key={tick} x={width} y={y - 5}>{tick.toLocaleString("zh-CN")}</text>;
          })}
          <line className="warning-line" x1="0" x2={width} y1={warningY} y2={warningY} />
          <text className="warning-label" x={width - 70} y={warningY - 8}>观察线</text>
          <path className="metric-area" fill={`url(#metricGradient-${metric.key})`} d={`${metricPath} L ${width} ${priceBottom} L 0 ${priceBottom} Z`} />
          <path className="line metric" d={metricPath} style={{ stroke: color.line }} />
          <path className="line index" d={indexPath} />
          <path className="volume-area" d={volumePath} />
          {[0, 0.17, 0.34, 0.51, 0.68, 0.85, 1].map((tick, index) => (
            <text className="axis-text date" key={tick} x={tick * width} y="418" textAnchor={index === 0 ? "start" : index === 6 ? "end" : "middle"}>
              {yearLabel(timeWindow.start + (timeWindow.end - timeWindow.start) * tick)}
            </text>
          ))}
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = volumeBottom - (tick / 4.2) * (volumeBottom - volumeTop);
            return (
              <g key={tick}>
                <line className="grid-line faint" x1="0" x2={width} y1={y} y2={y} />
                <text className="axis-text" x="0" y={y - 5}>{tick === 0 ? "0" : `${tick}.0万亿`}</text>
              </g>
            );
          })}
        </svg>
        <TimeSliderControl timeWindow={timeWindow} onTimeWindowChange={onTimeWindowChange} />
      </div>
      <div className="chart-readout">
        {metric.readouts.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThermometerDashboard() {
  const [range, setRange] = useState<RangeKey>("all");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(defaultBreadthWindow());
  const [maWindow, setMaWindow] = useState<MaWindow>(20);
  const [activeKey, setActiveKey] = useState<ToolKey>("breadth");
  const [explainExpanded, setExplainExpanded] = useState(false);
  const activeMetric = metrics.find((metric) => metric.key === activeKey) ?? metrics[0];
  const orderedMetrics = [
    "breadth",
    "marketCrowding",
    "szCrowding",
    "cybCrowding",
    "marginBuy",
    "turnover",
  ].map((key) => metrics.find((metric) => metric.key === key)).filter(Boolean) as MetricConfig[];
  const handleRangeChange = (nextRange: RangeKey) => {
    setRange(nextRange);
    setTimeWindow(windowFromRange(nextRange));
  };
  const handleTimeWindowChange = (nextWindow: TimeWindow) => {
    setRange("all");
    setTimeWindow(nextWindow);
  };
  const handleMetricChange = (nextKey: ToolKey) => {
    setActiveKey(nextKey);
    setExplainExpanded(false);
    if (nextKey === "breadth") {
      setRange("all");
      setTimeWindow(defaultBreadthWindow());
      return;
    }
    if (activeKey === "breadth") {
      setTimeWindow(windowFromRange(range));
    }
  };

  return (
    <main className="dashboard-shell">
      <section className="topbar" aria-label="产品状态栏">
        <div>
          <p className="eyebrow">A-SHARE OBJECTIVE INDICATOR TOOLBOX</p>
          <h1>A股市场结构仪</h1>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" type="button" title="模拟刷新" aria-label="模拟刷新">↻</button>
        </div>
      </section>

      <section className="overview-panel" aria-label="总览">
        <div className="overview-copy">
          <div className="structure-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <p>从成交拥挤度、市场宽度、杠杆参与度和成交活跃度四个维度，观察 A 股市场内部结构状态。</p>
        </div>
        <StructureRadar />
      </section>

      <section className="metric-switcher" aria-label="指标选择">
        {orderedMetrics.map((metric) => (
          <button
            className={`switch-card ${activeKey === metric.key ? "active" : ""}`}
            data-metric-key={metric.key}
            key={metric.key}
            onClick={() => handleMetricChange(metric.key)}
            type="button"
          >
            <span>{metric.name}</span>
            <strong>{metric.value}</strong>
            <em>{metric.state}</em>
          </button>
        ))}
      </section>

      <section className="metric-header">
        <div>
          <p className="page-kicker">当前指标</p>
          <h2>{activeMetric.name}</h2>
          <p className="metric-subtitle">{activeMetric.summary}</p>
        </div>
      </section>

      <section className="explain-box" aria-label={`${activeMetric.name}说明`}>
        <strong>说明</strong>
        <div className="explain-content-wrap">
          <div className={`explain-content ${explainExpanded ? "expanded" : ""}`}>
            {(Array.isArray(activeMetric.description) ? activeMetric.description : [activeMetric.description]).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p>本页仅展示客观统计结果和计算口径，不构成任何投资建议。</p>
          </div>
          <button className="explain-toggle" onClick={() => setExplainExpanded((expanded) => !expanded)} type="button">
            {explainExpanded ? "收起" : "展开"}
          </button>
        </div>
      </section>

      {activeMetric.key === "breadth" ? (
        <BreadthControlPanel
          maWindow={maWindow}
          onMaWindowChange={setMaWindow}
          onTimeWindowChange={handleTimeWindowChange}
          timeWindow={timeWindow}
        />
      ) : null}

      <Chart
        metric={activeMetric}
        onRangeChange={handleRangeChange}
        maWindow={maWindow}
        onMaWindowChange={setMaWindow}
        onTimeWindowChange={handleTimeWindowChange}
        range={range}
        timeWindow={timeWindow}
      />

      <section className="signal-panel" aria-label={`${activeMetric.name}信号`}>
        <div className="signal-title">
          <h2>当前{activeMetric.name}信号</h2>
          <span>当前值 {activeMetric.value}</span>
        </div>
        <p className="signal-intro">
          下面解释该指标的区间含义，仅用于理解指标数值所处状态，不指向具体买卖动作。
        </p>
        <div className="zone-grid">
          {activeMetric.zones.map((zone) => (
            <article className="zone-card" key={zone.title}>
              <strong>{zone.title}</strong>
              <p>{zone.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="formula-panel" aria-label="计算口径">
        <h2>计算口径</h2>
        <div className="formula-table">
          {[
            ["指标定义", activeMetric.formula],
            ["当前值", activeMetric.value],
            ["观察线", `${activeMetric.warning}${activeMetric.unit}`],
            ["样本范围", activeMetric.scope],
            ["更新时间", "2026-08-19 15:10，模拟数据"],
          ].map(([label, value]) => (
            <div className="formula-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="compliance-note" aria-label="说明">
        <strong>客观说明</strong>
        <p>
          本产品以日频客观统计指标为主。除特别标注外，指标于交易日收盘后更新；融资融券相关指标以交易所次交易日披露数据为准。
          盘中数据如展示，仅作为未确认估算值。本页仅展示客观统计结果和计算口径，不构成任何投资建议。
        </p>
      </section>
    </main>
  );
}
