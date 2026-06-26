import { generateQrSvg } from "./qr.js";

export const MAX_QR_CODES = 2000;
export const QR_LINK_VERSION = "1";

export function buildVerifyUrl(origin, code) {
  const url = new URL("/check.html", origin);
  url.searchParams.set("code", String(code));
  url.searchParams.set("v", QR_LINK_VERSION);
  return url.toString();
}

export function safeCodeName(code) {
  return String(code).replace(/[^\dA-Za-z_-]/g, "_");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printLabelsHtml(origin, rows) {
  const labels = rows.map((row) => {
    const verifyUrl = buildVerifyUrl(origin, row.code);
    return `
      <article class="label">
        <div class="qr">${generateQrSvg(verifyUrl)}</div>
        <strong>${escapeHtml(row.code)}</strong>
        <span>${escapeHtml(row.product_name || "产品二维码追溯")}</span>
        <em>${escapeHtml(row.batch_no || "")}</em>
      </article>
    `;
  }).join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>二维码印刷版</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        font-family: Arial, "Microsoft YaHei", sans-serif;
        background: #eef2f5;
      }
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 16px;
        background: #0f5fb1;
        color: #fff;
      }
      .toolbar strong { font-size: 16px; }
      .toolbar span { font-size: 13px; opacity: 0.86; }
      .toolbar button {
        min-height: 34px;
        padding: 0 14px;
        border: 0;
        border-radius: 6px;
        color: #0f5fb1;
        background: #fff;
        font-weight: 700;
        cursor: pointer;
      }
      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 12px auto;
        padding: 8mm;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 3mm;
        align-content: start;
        background: #fff;
        box-shadow: 0 8px 28px rgba(17, 24, 39, 0.12);
      }
      .label {
        min-height: 50mm;
        padding: 3mm 2.5mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5mm;
        border: 0.2mm dashed #c7d2df;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .qr {
        width: 31mm;
        height: 31mm;
      }
      .qr svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .label strong {
        font: 700 8pt Consolas, monospace;
        letter-spacing: 0;
      }
      .label span,
      .label em {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #374151;
        font-size: 6.5pt;
        font-style: normal;
      }
      @page {
        size: A4;
        margin: 8mm;
      }
      @media print {
        body { background: #fff; }
        .toolbar { display: none; }
        .sheet {
          width: auto;
          min-height: auto;
          margin: 0;
          padding: 0;
          box-shadow: none;
        }
        .label { border-color: #d1d5db; }
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <div>
        <strong>二维码印刷版</strong>
        <span>共 ${rows.length} 个，A4 四列排版，二维码为 SVG 矢量图</span>
      </div>
      <button type="button" onclick="window.print()">打印 / 另存为 PDF</button>
    </div>
    <main class="sheet">${labels}</main>
  </body>
</html>`;
}
