const moreButton = document.getElementById("moreButton");
const productDetail = document.getElementById("productDetail");
const productImage = document.getElementById("productImage");
const productFallback = document.getElementById("productFallback");

productImage.addEventListener("error", () => {
  productImage.hidden = true;
  productFallback.hidden = false;
});

moreButton.addEventListener("click", () => {
  productDetail.classList.toggle("is-hidden");
  moreButton.textContent = productDetail.classList.contains("is-hidden")
    ? "点击查看更多..."
    : "收起产品详情";
});
