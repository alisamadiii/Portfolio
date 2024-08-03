const words = ["Mastering css", "ali reza samadi"];

const texts = document.querySelectorAll(".text");

texts.forEach((text, index) => {
  const letters = words[index].split("");

  letters.forEach((letter) => {
    const span = document.createElement("span");

    span.innerHTML = letter;

    text.append(span);
  });
});
