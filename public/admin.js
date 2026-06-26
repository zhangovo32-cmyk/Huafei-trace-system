const loginPanel = document.getElementById("loginPanel");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const adminStatus = document.getElementById("adminStatus");
const productForm = document.getElementById("productForm");
const productsBody = document.getElementById("productsBody");
const generateForm = document.getElementById("generateForm");
const generateProductSelect = document.getElementById("generateProductSelect");
const codeProductFilter = document.getElementById("codeProductFilter");
const codeStatusFilter = document.getElementById("codeStatusFilter");
const codeSearchInput = document.getElementById("codeSearchInput");
const codesBody = document.getElementById("codesBody");
const logsBody = document.getElementById("logsBody");
const generatedOutput = document.getElementById("generatedOutput");
const logCodeInput = document.getElementById("logCodeInput");
const exportQrZipButton = document.getElementById("exportQrZipButton");
const exportFilteredCsvButton = document.getElementById("exportFilteredCsvButton");
const downloadFilteredQrButton = document.getElementById("downloadFilteredQrButton");
const downloadGeneratedQrButton = document.getElementById("downloadGeneratedQrButton");
const printGeneratedQrButton = document.getElementById("printGeneratedQrButton");
const printFilteredQrButton = document.getElementById("printFilteredQrButton");

let products = [];
let lastGeneratedCodes = [];

function buildVerifyUrl(code) {
  const url = new URL("/check.html", window.location.origin);
  url.searchParams.set("code", String(code));
  url.searchParams.set("v", "1");
  return url.toString();
}

function showStatus(message, type = "info") {
  adminStatus.textContent = message;
  adminStatus.dataset.type = type;
  if (message) {
    window.setTimeout(() => {
      if (adminStatus.textContent === message) adminStatus.textContent = "";
    }, 3500);
  }
}

function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date).replace(/\//g, "-");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : {};
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "请求失败");
  }
  return data;
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function codeFilterParams() {
  const params = new URLSearchParams();
  if (codeProductFilter.value) params.set("product_id", codeProductFilter.value);
  if (codeStatusFilter.value) params.set("status", codeStatusFilter.value);
  if (codeSearchInput.value.trim()) params.set("q", codeSearchInput.value.trim());
  return params;
}

function downloadFile(path, params) {
  const query = params.toString();
  window.location.href = query ? `${path}?${query}` : path;
}

function openFile(path, params) {
  const query = params.toString();
  window.open(query ? `${path}?${query}` : path, "_blank", "noopener");
}

async function downloadZipByCodes(codes) {
  const response = await fetch("/api/admin/qrcodes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ codes })
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : {};
    throw new Error(data.message || "二维码下载失败");
  }

  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "qr-codes.zip";
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

async function openPrintByCodes(codes) {
  const response = await fetch("/api/admin/qrcodes/print", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ codes })
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : {};
    throw new Error(data.message || "打印版生成失败");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function setAuthenticated(authenticated) {
  loginPanel.classList.toggle("is-hidden", authenticated);
  adminApp.classList.toggle("is-hidden", !authenticated);
}

function fillProductSelects() {
  const options = products
    .map((product) => `<option value="${product.id}">${product.name}（${product.batch_no || "无批号"}）</option>`)
    .join("");

  generateProductSelect.innerHTML = options || "<option value=\"\">暂无产品</option>";
  codeProductFilter.innerHTML = `<option value="">全部产品</option>${options}`;
}

async function loadProducts() {
  const data = await api("/api/admin/products");
  products = data.products || [];
  fillProductSelects();

  productsBody.innerHTML = products.map((product) => `
    <tr>
      <td>${product.id}</td>
      <td>${product.brand || ""}</td>
      <td>${product.name || ""}</td>
      <td>${product.batch_no || ""}</td>
      <td>${product.code_count || 0}</td>
      <td><button type="button" data-edit-product="${product.id}">编辑</button></td>
    </tr>
  `).join("");
}

async function loadCodes() {
  const params = codeFilterParams();

  const data = await api(`/api/admin/codes?${params.toString()}`);
  codesBody.innerHTML = (data.codes || []).map((row) => `
    ${(() => {
      const verifyUrl = buildVerifyUrl(row.code);
      return `
    <tr>
      <td><code>${row.code}</code></td>
      <td>${row.product_name || "--"}</td>
      <td>${row.scan_count || 0}</td>
      <td>${formatTime(row.first_scan_time)}</td>
      <td>${formatTime(row.last_scan_time)}</td>
      <td>
        <select data-code-status="${row.id}">
          <option value="normal"${row.status === "normal" ? " selected" : ""}>正常</option>
          <option value="risk"${row.status === "risk" ? " selected" : ""}>风险</option>
          <option value="disabled"${row.status === "disabled" ? " selected" : ""}>作废</option>
        </select>
      </td>
      <td>
        <a href="${verifyUrl}" target="_blank" rel="noreferrer">打开</a>
        <button type="button" data-copy-url="${verifyUrl}">复制</button>
      </td>
    </tr>
      `;
    })()}
  `).join("");
}

async function loadLogs() {
  const params = new URLSearchParams();
  if (logCodeInput.value.trim()) params.set("code", logCodeInput.value.trim());

  const data = await api(`/api/admin/logs?${params.toString()}`);
  logsBody.innerHTML = (data.logs || []).map((log) => `
    <tr>
      <td>${formatTime(log.scan_time)}</td>
      <td><code>${log.code}</code></td>
      <td>${log.product_name || "--"}</td>
      <td>${log.ip || "--"}</td>
      <td class="ua-cell">${log.user_agent || ""}</td>
    </tr>
  `).join("");
}

async function refreshAll() {
  await loadProducts();
  await loadCodes();
  await loadLogs();
}

function resetProductForm() {
  productForm.reset();
  productForm.elements.id.value = "";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "正在登录...";
  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(formToObject(loginForm))
    });
    setAuthenticated(true);
    await refreshAll();
    showStatus("登录成功", "success");
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST", body: "{}" });
  setAuthenticated(false);
});

document.getElementById("resetProductForm").addEventListener("click", resetProductForm);
document.getElementById("cancelEditButton").addEventListener("click", resetProductForm);

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = formToObject(productForm);
  const id = payload.id;
  delete payload.id;

  try {
    if (id) {
      await api(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showStatus("产品已更新", "success");
    } else {
      await api("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
      showStatus("产品已新增", "success");
    }
    resetProductForm();
    await loadProducts();
    await loadCodes();
  } catch (error) {
    showStatus(error.message, "danger");
  }
});

productsBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-edit-product]");
  if (!button) return;

  try {
    const data = await api(`/api/admin/products/${button.dataset.editProduct}`);
    const product = data.product;
    ["id", "brand", "name", "specs", "weight", "batch_no", "production_date", "manufacturer", "image_url", "description"].forEach((key) => {
      productForm.elements[key].value = product[key] || "";
    });
    productForm.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showStatus(error.message, "danger");
  }
});

generateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  generatedOutput.textContent = "正在生成...";
  try {
    const data = await api("/api/admin/codes/generate", {
      method: "POST",
      body: JSON.stringify(formToObject(generateForm))
    });
    lastGeneratedCodes = data.codes || [];
    downloadGeneratedQrButton.disabled = lastGeneratedCodes.length === 0;
    printGeneratedQrButton.disabled = lastGeneratedCodes.length === 0;
    generatedOutput.textContent = data.codes.join("\n");
    showStatus(`已生成 ${data.count} 个防伪码`, "success");
    await loadProducts();
    await loadCodes();
  } catch (error) {
    generatedOutput.textContent = "";
    showStatus(error.message, "danger");
  }
});

document.getElementById("exportButton").addEventListener("click", () => {
  const params = new URLSearchParams();
  if (generateProductSelect.value) params.set("product_id", generateProductSelect.value);
  downloadFile("/api/admin/export", params);
});

exportQrZipButton.addEventListener("click", () => {
  const params = new URLSearchParams();
  if (generateProductSelect.value) params.set("product_id", generateProductSelect.value);
  downloadFile("/api/admin/qrcodes", params);
});

downloadGeneratedQrButton.addEventListener("click", async () => {
  if (!lastGeneratedCodes.length) {
    showStatus("请先批量生成防伪码", "danger");
    return;
  }

  try {
    await downloadZipByCodes(lastGeneratedCodes);
    showStatus("本次生成的二维码 ZIP 已开始下载", "success");
  } catch (error) {
    showStatus(error.message, "danger");
  }
});

printGeneratedQrButton.addEventListener("click", async () => {
  if (!lastGeneratedCodes.length) {
    showStatus("请先批量生成防伪码", "danger");
    return;
  }

  try {
    await openPrintByCodes(lastGeneratedCodes);
    showStatus("本次生成的二维码印刷版已打开", "success");
  } catch (error) {
    showStatus(error.message, "danger");
  }
});

exportFilteredCsvButton.addEventListener("click", () => {
  downloadFile("/api/admin/export", codeFilterParams());
});

downloadFilteredQrButton.addEventListener("click", () => {
  downloadFile("/api/admin/qrcodes", codeFilterParams());
});

printFilteredQrButton.addEventListener("click", () => {
  openFile("/api/admin/qrcodes/print", codeFilterParams());
});

document.getElementById("codeFilterForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadCodes();
});

codesBody.addEventListener("change", async (event) => {
  const select = event.target.closest("[data-code-status]");
  if (!select) return;

  try {
    await api(`/api/admin/codes/${select.dataset.codeStatus}`, {
      method: "PATCH",
      body: JSON.stringify({ status: select.value })
    });
    showStatus("防伪码状态已更新", "success");
  } catch (error) {
    showStatus(error.message, "danger");
    await loadCodes();
  }
});

codesBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-url]");
  if (!button) return;

  try {
    await copyText(button.dataset.copyUrl);
    showStatus("验证链接已复制", "success");
  } catch (error) {
    showStatus(`复制失败：${error.message}`, "danger");
  }
});

document.getElementById("logFilterForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadLogs();
});

document.getElementById("refreshLogsButton").addEventListener("click", loadLogs);

async function boot() {
  try {
    const session = await api("/api/admin/session");
    if (!session.configured) {
      loginMessage.textContent = "请先在 Cloudflare Pages 中设置 ADMIN_PASSWORD。";
    }
    setAuthenticated(session.authenticated);
    if (session.authenticated) await refreshAll();
  } catch (error) {
    setAuthenticated(false);
    loginMessage.textContent = error.message;
  }
}

boot();
