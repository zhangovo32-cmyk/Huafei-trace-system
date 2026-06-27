const productImage = document.getElementById("productImage");
const productFallback = document.getElementById("productFallback");

productImage.addEventListener("error", () => {
  productImage.hidden = true;
  productFallback.hidden = false;
});
