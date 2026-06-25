const codeText = document.getElementById("codeText");
const scanCount = document.getElementById("scanCount");
const resultMessage = document.getElementById("resultMessage");
const certifiedTime = document.getElementById("certifiedTime");
const verifyPanel = document.getElementById("verifyPanel");
const productCard = document.getElementById("productCard");
const stateCard = document.getElementById("stateCard");
const stateTitle = document.getElementById("stateTitle");
const stateDetail = document.getElementById("stateDetail");
const productImage = document.getElementById("productImage");
const productFallback = document.getElementById("productFallback");
const productDetail = document.getElementById("productDetail");
const moreButton = document.getElementById("moreButton");

const productFields = {
  brand: document.getElementById("productBrand"),
  name: document.getElementById("productName"),
  specs: document.getElementById("productSpecs"),
  weight: document.getElementById("productWeight"),
  batch: document.getElementById("productBatch"),
  date: document.getElementById("productDate"),
  maker: document.getElementById("productMaker")
};

function getCodeFromPath() {
  const queryCode = new URLSearchParams(window.location.search).get("code");
  if (queryCode) return queryCode;

  const match = window.location.pathname.match(/\/check\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
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

function setPanelLevel(level) {
  verifyPanel.classList.remove("is-success", "is-warning", "is-danger");
  verifyPanel.classList.add(`is-${level || "success"}`);
}

function displayBrandName(brand) {
  if (!brand || brand.includes("席士博")) return "三环";
  return brand;
}

function setProduct(product) {
  if (!product) {
    productCard.classList.add("is-hidden");
    productCard.classList.remove("is-loading");
    productDetail.classList.add("is-hidden");
    return;
  }

  productCard.classList.remove("is-hidden", "is-loading");
  productFields.brand.textContent = displayBrandName(product.brand);
  productFields.name.textContent = product.name || "--";
  productFields.specs.textContent = product.specs || "--";
  productFields.weight.textContent = product.weight || "--";
  productFields.batch.textContent = product.batch_no || "--";
  productFields.date.textContent = product.production_date || "--";
  productFields.maker.textContent = product.manufacturer || "--";

  productDetail.textContent = product.description || "暂无更多产品详情。";
  productDetail.classList.add("is-hidden");
  moreButton.textContent = "点击查看更多...";

  productImage.hidden = false;
  productFallback.hidden = true;
  productImage.onerror = () => {
    productImage.hidden = true;
    productFallback.hidden = false;
  };
  productImage.src = product.image_url || "/assets/product-bag.png";
}

function setStateCard(data) {
  if (data.exists && data.status === "normal") {
    stateCard.classList.add("is-hidden");
    return;
  }

  stateCard.classList.remove("is-hidden");
  stateTitle.textContent = "核验提示";
  stateDetail.textContent = data.message || "该防伪码暂无法完成认证，请联系厂家核验。";
}

async function loadVerification() {
  const code = getCodeFromPath();
  codeText.textContent = code || "未识别";

  if (!code) {
    setPanelLevel("danger");
    resultMessage.textContent = "未识别到防伪编码，请重新扫码";
    certifiedTime.textContent = formatTime(new Date().toISOString());
    setProduct(null);
    setStateCard({ exists: false, message: "当前链接缺少防伪码。" });
    return;
  }

  try {
    const response = await fetch(`/api/check/${encodeURIComponent(code)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "查询失败");

    setPanelLevel(data.level);
    scanCount.textContent = String(data.scan_count || 0);
    resultMessage.textContent = data.message;
    certifiedTime.textContent = formatTime(data.certified_time || data.last_scan_time);
    setProduct(data.product);
    setStateCard(data);
  } catch (error) {
    setPanelLevel("danger");
    resultMessage.textContent = "防伪中心连接失败，请稍后重试";
    certifiedTime.textContent = formatTime(new Date().toISOString());
    setProduct(null);
    setStateCard({ exists: false, message: error.message });
  }
}

moreButton.addEventListener("click", () => {
  productDetail.classList.toggle("is-hidden");
  moreButton.textContent = productDetail.classList.contains("is-hidden")
    ? "点击查看更多..."
    : "收起产品详情";
});

loadVerification();
