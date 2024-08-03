const canvas = document.querySelector("#canvas");

canvas.width = 600; // Width of the container
canvas.height = 600; // Height of the container

const context = canvas.getContext("2d");

Array.from({ length: 600 }).map(() => {
  context.fillStyle = `rgba(255, 255, 255, ${Math.random()})`;
  context.fillRect(
    Math.floor(Math.random() * 600),
    Math.floor(Math.random() * 600),
    1,
    1
  );
});
