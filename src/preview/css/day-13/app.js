const canvas = document.querySelector("#canvas");

canvas.width = 600;
canvas.height = 600;

const context = canvas.getContext("2d");

const rectanglesPerRow = Math.floor((canvas.width - 10) / 10); // Number of rectangles per row
const rectanglesPerColumn = Math.floor((canvas.height - 10) / 10); // Number of rectangles per column
const totalRectangles = rectanglesPerRow * rectanglesPerColumn; // Total number of rectangles

const rectangles = Array.from({ length: totalRectangles }).map((_, index) => ({
  x: 10 + (index % rectanglesPerRow) * 10, // Calculate x position
  y: 10 + Math.floor(index / rectanglesPerRow) * 10,
  width: 2,
  height: 2,
  opacity: 1,
  phase: Math.random() * Math.PI * 4,
}));

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  rectangles.forEach((rect) => {
    const time = (performance.now() / 1000) * 2; // Time in seconds
    rect.opacity = 0.3 + 0.3 * Math.sin(time + rect.phase); // Calculate opacity using sine wave

    context.fillStyle = `rgba(97, 219, 251, ${rect.opacity})`;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  });

  requestAnimationFrame(draw);
}

draw();
