const svgLines = document.querySelectorAll(".svg-lines");

svgLines.forEach((line) => {
  const pathLength = line.getTotalLength();

  line.style.setProperty("--dasharray", pathLength + 1);
  line.style.setProperty("--dashoffset", pathLength + 1);
});
