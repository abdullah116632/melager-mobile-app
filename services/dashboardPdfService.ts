import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { DashboardPdfData } from "@/types/dashboard";
import {
  formatDashboardAmount,
  formatDashboardRate,
  formatDashboardShortDate,
} from "@/utils/dashboard";

const escapeHtml = (value: string | number): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const createBreakdownHtml = (data: DashboardPdfData): string => {
  const {
    messName,
    periodStart,
    periodEnd,
    consumerCount,
    consumerRows,
    totalMeals,
    totalExpenses,
    totalDeposits,
    mealRate,
    netBalance,
  } = data;
  const balanceColor = netBalance >= 0 ? "#047857" : "#DC2626";
  const rowsHtml = consumerRows
    .map((row, index) => {
      const rowBalanceColor = row.balance >= 0 ? "#047857" : "#DC2626";
      const rowBalanceSign = row.balance >= 0 ? "+" : "-";
      return `
        <tr class="${index % 2 === 0 ? "even" : "odd"}">
          <td class="member">${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.meals)}</td>
          <td>BDT ${escapeHtml(formatDashboardAmount(row.cost))}</td>
          <td>BDT ${escapeHtml(formatDashboardAmount(row.deposits))}</td>
          <td style="color:${rowBalanceColor};font-weight:700">${rowBalanceSign}BDT ${escapeHtml(formatDashboardAmount(Math.abs(row.balance)))}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 14mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #17202A; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0F766E; padding-bottom: 12px; margin-bottom: 14px; }
          .brand { color: #0F766E; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
          h1 { margin: 5px 0 4px; font-size: 25px; color: #111827; }
          .mess { color: #4B5563; font-size: 12px; }
          .period { text-align: right; padding: 9px 12px; border: 1px solid #99F6E4; border-radius: 8px; background: #F0FDFA; }
          .period-label { color: #0F766E; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
          .period-value { margin-top: 4px; font-size: 12px; font-weight: 700; }
          .metrics { display: flex; gap: 8px; margin-bottom: 15px; }
          .metric { flex: 1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 9px 10px; background: #FFFFFF; }
          .metric.balance { border-color: ${netBalance >= 0 ? "#A7F3D0" : "#FECACA"}; background: ${netBalance >= 0 ? "#ECFDF5" : "#FEF2F2"}; }
          .metric-label { color: #6B7280; font-size: 8px; font-weight: 700; letter-spacing: .7px; text-transform: uppercase; }
          .metric-value { margin-top: 4px; font-size: 16px; font-weight: 700; color: #111827; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          thead { display: table-header-group; }
          th { padding: 9px 10px; color: #FFFFFF; background: #0F766E; font-size: 9px; letter-spacing: .5px; text-transform: uppercase; text-align: right; }
          th:first-child { width: 34%; text-align: left; border-radius: 7px 0 0 0; }
          th:last-child { border-radius: 0 7px 0 0; }
          td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; text-align: right; }
          td.member { text-align: left; font-weight: 600; }
          tr.even td { background: #FFFFFF; }
          tr.odd td { background: #F8FAFC; }
          tfoot td { padding: 10px; color: #FFFFFF; background: #0F766E; border: 0; font-weight: 700; }
          .note { margin-top: 10px; color: #6B7280; font-size: 9px; }
          .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 8px; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Melager</div>
            <h1>Consumer Breakdown</h1>
            <div class="mess">${escapeHtml(messName)}</div>
          </div>
          <div class="period">
            <div class="period-label">Selected period</div>
            <div class="period-value">${escapeHtml(formatDashboardShortDate(periodStart))} - ${escapeHtml(formatDashboardShortDate(periodEnd))}</div>
          </div>
        </div>
        <div class="metrics">
          <div class="metric"><div class="metric-label">Total meals</div><div class="metric-value">${escapeHtml(totalMeals)}</div></div>
          <div class="metric"><div class="metric-label">Total expenses</div><div class="metric-value">BDT ${escapeHtml(formatDashboardAmount(totalExpenses))}</div></div>
          <div class="metric"><div class="metric-label">Total deposits</div><div class="metric-value">BDT ${escapeHtml(formatDashboardAmount(totalDeposits))}</div></div>
          <div class="metric"><div class="metric-label">Meal rate</div><div class="metric-value">${mealRate > 0 ? `BDT ${escapeHtml(formatDashboardRate(mealRate))}` : "-"}</div></div>
          <div class="metric balance"><div class="metric-label">Current balance</div><div class="metric-value" style="color:${balanceColor}">${netBalance >= 0 ? "+" : "-"}BDT ${escapeHtml(formatDashboardAmount(Math.abs(netBalance)))}</div></div>
        </div>
        <table>
          <thead><tr><th>Consumers (${consumerCount})</th><th>Meals</th><th>Cost</th><th>Deposit</th><th>Balance</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr><td>Total</td><td>${escapeHtml(totalMeals)}</td><td>BDT ${escapeHtml(formatDashboardAmount(totalExpenses))}</td><td>BDT ${escapeHtml(formatDashboardAmount(totalDeposits))}</td><td>${netBalance >= 0 ? "+" : "-"}BDT ${escapeHtml(formatDashboardAmount(Math.abs(netBalance)))}</td></tr></tfoot>
        </table>
        <div class="note">Balance = Deposit - (Meals x meal rate). The selected start and end dates are both included.</div>
        <div class="footer">Generated ${escapeHtml(new Date().toLocaleString("en-GB"))}</div>
      </body>
    </html>`;
};

export const exportDashboardBreakdownPdf = async (
  data: DashboardPdfData,
): Promise<void> => {
  const result = await Print.printToFileAsync({
    html: createBreakdownHtml(data),
  });
  if (Platform.OS === "web") return;

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Save or share Consumer Breakdown PDF",
    });
  } else {
    await Print.printAsync({ uri: result.uri });
  }
};
