const svgLines = document.querySelectorAll(".svg-lines");

svgLines.forEach((line) => {
  const pathLength = line.getTotalLength();

  line.style.setProperty("--dasharray", pathLength);
  line.style.setProperty("--dashoffset", pathLength);
});
