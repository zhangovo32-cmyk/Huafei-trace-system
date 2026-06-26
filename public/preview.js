const moreButton = document.getElementById("moreButton");
const productDetail = document.getElementById("productDetail");
const productImage = document.getElementById("productImage");
const productFallback = document.getElementById("productFallback");

productImage.addEventListener("error", () => {
  productImage.hidden = true;
  productFallback.hidden = false;
});

moreButton.addEventListener("click", () => {
  window.location.href = "/product-detail";
});
