const productImage = document.getElementById("productImage");
const productFallback = document.getElementById("productFallback");

productImage.addEventListener("error", () => {
  productImage.hidden = true;
  productFallback.hidden = false;
});

function setupTraceVideos() {
  const modal = document.getElementById("videoModal");
  const player = document.getElementById("traceVideoPlayer");
  const closeButton = document.getElementById("videoModalClose");
  const title = document.getElementById("videoModalTitle");
  const openLink = document.getElementById("videoOpenLink");
  const buttons = document.querySelectorAll("[data-video-src]");

  if (!modal || !player || buttons.length === 0) return;

  const closeVideo = () => {
    player.pause();
    player.removeAttribute("src");
    player.removeAttribute("poster");
    player.load();
    modal.classList.add("is-hidden");
    modal.setAttribute("aria-hidden", "true");
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const src = button.dataset.videoSrc;
      if (!src) return;

      const label = button.dataset.videoTitle || "热点视频";
      const poster = button.dataset.videoPoster || "";

      if (title) title.textContent = label;
      if (poster) player.setAttribute("poster", poster);
      player.src = src;
      if (openLink) openLink.href = src;

      modal.classList.remove("is-hidden");
      modal.setAttribute("aria-hidden", "false");
      player.load();
    });
  });

  if (closeButton) closeButton.addEventListener("click", closeVideo);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeVideo();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("is-hidden")) closeVideo();
  });
}

setupTraceVideos();
