const wrapper = document.querySelector(".wrapper");
const dotsAnimation = document.querySelector(".dots-animation");

let counter = 1;

Array.from({ length: 90 }).map((_, index) => {
  const divElement = document.createElement("div");
  divElement.setAttribute("data-index", index + 1);
  divElement.setAttribute("data-light", "true");
  divElement.setAttribute("data-state", "off");
  divElement.style.setProperty("--i", addingDelay(index));

  dotsAnimation.append(divElement);
});

function addingDelay(index) {
  if (index % 18 === 0) {
    counter = 1;
  }

  return counter++;
}

const activeIndex = [
  1, 5, 7, 8, 9, 11, 15, 16, 17, 18, 19, 20, 23, 25, 30, 32, 35, 37, 39, 41, 43,
  44, 45, 49, 53, 55, 58, 59, 61, 66, 68, 71, 73, 77, 79, 80, 81, 83, 87, 89,
];

wrapper.addEventListener("mouseover", () => {
  const eachDots = document.querySelectorAll("[data-light]");

  activeIndex.map((value) => {
    eachDots[value - 1].setAttribute("data-state", "high");
  });
});

wrapper.addEventListener("mouseleave", () => {
  const eachDots = document.querySelectorAll("[data-light]");

  eachDots.forEach((dot) => {
    dot.setAttribute("data-state", "off");
  });
});
