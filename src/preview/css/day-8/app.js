const canvas = document.querySelector("#canvas");

canvas.width = 600; // Width of the container
canvas.height = 600; // Height of the container

const context = canvas.getContext("2d");

const rectangles = Array.from({ length: 100 }).map(() => ({
  x: Math.random() * 600,
  y: Math.random() * 600,
  opacity: Math.random(),
  dx: (Math.random() - 0.5) * 0.5, // Random speed in x direction
  dy: (Math.random() - 0.5) * 0.5, // Random speed in y direction
}));

function animate() {
  context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

  rectangles.forEach((rect) => {
    // Update position
    rect.x += rect.dx;
    rect.y += rect.dy;

    // Bounce off the edges
    if (rect.x < 0 || rect.x > canvas.width) rect.dx = -rect.dx;
    if (rect.y < 0 || rect.y > canvas.height) rect.dy = -rect.dy;

    // Draw rectangle
    context.fillStyle = `rgba(0, 0, 0, ${rect.opacity})`;
    context.fillRect(rect.x, rect.y, 1, 1);
  });

  requestAnimationFrame(animate);
}

animate();
