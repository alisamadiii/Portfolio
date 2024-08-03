const canvas = document.querySelector("#canvas");

canvas.width = 400; // Width of the container
canvas.height = 300; // Height of the container

const context = canvas.getContext("2d");

canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.pointerEvents = "none";

const rectanglesPerRow = Math.floor((canvas.width - 5) / 5); // Number of rectangles per row
const rectanglesPerColumn = Math.floor((canvas.height - 5) / 5); // Number of rectangles per column
const totalRectangles = rectanglesPerRow * rectanglesPerColumn; // Total number of rectangles

const rectangles = Array.from({ length: totalRectangles }).map((_, index) => ({
  x: 5 + (index % rectanglesPerRow) * 5, // Calculate x position
  y: 5 + Math.floor(index / rectanglesPerRow) * 5,
  width: 2,
  height: 2,
  opacity: 1,
  phase: Math.random() * Math.PI * 4,
}));

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  rectangles.forEach((rect) => {
    const time = (performance.now() / 1000) * 3; // Time in seconds
    rect.opacity = 0.3 + 0.3 * Math.sin(time + rect.phase); // Calculate opacity using sine wave

    context.fillStyle = `rgba(93, 227, 255, ${rect.opacity})`;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  });

  requestAnimationFrame(draw);
}

draw();
