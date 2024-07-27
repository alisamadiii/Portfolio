const textValue = "itisworkingfine@testing.com";

const text = document.querySelector(".text");

const wrapper = document.querySelector(".wrapper");
const buttons = document.querySelectorAll("button");
const border = document.querySelector(".border");
const borderTexts = document.querySelectorAll(".border p");

const [beforeAt, afterAt] = textValue.split("@");
const [before, after] = afterAt.split(".");

text.innerHTML = `<span class="user" data-user="${beforeAt}">${beforeAt}</span><span class="symbol" data-user="@">@</span><span class="address" data-user="${before}">${before}</span><span class="com" data-user=".${after}">.${after}</span>`;

buttons.forEach((button, index) => {
  button.addEventListener("mouseover", () => {
    const value = button.value;

    const spans = text.querySelectorAll(`span`);

    spans.forEach((span) => span.classList.remove("active"));

    border.classList.add("active");

    borderTexts[index].classList.add("active");

    if (value === "user") {
      const element = text.querySelector(`.${value}`);

      element.classList.add("active");
      border.style.setProperty(
        "--width",
        `${element.getBoundingClientRect().width}px`
      );
      border.style.setProperty(
        "--left",
        `${element.getBoundingClientRect().left - wrapper.getBoundingClientRect().left}px`
      );
    } else if (value === "link") {
      const elements = [
        text.querySelector(".address"),
        text.querySelector(".com"),
      ];

      ElementsAddingClass(elements);
    } else if (value === "email") {
      const elements = [
        text.querySelector(".user"),
        text.querySelector(".symbol"),
        text.querySelector(".address"),
        text.querySelector(".com"),
      ];

      ElementsAddingClass(elements);
    } else if (value === "social") {
      const elements = [
        text.querySelector(".symbol"),
        text.querySelector(".address"),
      ];

      ElementsAddingClass(elements);
    }
  });
});

buttons.forEach((button, index) => {
  button.addEventListener("mouseleave", () => {
    const spans = text.querySelectorAll(`span`);

    spans.forEach((span) => span.classList.remove("active"));

    border.classList.remove("active");

    borderTexts[index].classList.remove("active");
  });
});

function ElementsAddingClass(elements) {
  elements.forEach((element) => element.classList.add("active"));
  const totalWidth = elements.reduce(
    (acc, element) => acc + element.getBoundingClientRect().width,
    0
  );

  border.style.setProperty("--width", `${totalWidth}px`);
  border.style.setProperty(
    "--left",
    `${elements[0].getBoundingClientRect().left - wrapper.getBoundingClientRect().left}px`
  );
}
