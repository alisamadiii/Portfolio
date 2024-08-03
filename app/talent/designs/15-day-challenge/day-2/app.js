const container = document.querySelector(".container");
const wrapper = document.querySelector(".wrapper");

// Generating the Card for using Array
const elementsData = [
  "Tax",
  "Billing",
  "Invoicing",
  "Capital",
  "Atlas",
  "Payments",
  "Climate",
  "Treasury",
  "Connect",
  "Radar",
  "Terminal",
  "Checkout",
  "Issuing",
  "Identity",
  "Sigma",
  "Elements",
];

Array.from({ length: 36 }).forEach((_, index) => {
  const elements = document.createElement("div");

  elements.classList.add("items");
  elements.classList.add(`item-${index + 1}`);

  if (elementsData[index]) {
    const title = document.createElement("span");
    title.innerHTML = elementsData[index];

    const img = document.createElement("img");

    img.src =
      "https://www.shareicon.net/data/2015/10/21/659529_white_512x512.png";
    img.classList.add("icon");

    elements.append(img);
    elements.append(title);

    elements.style.gridArea = elementsData[index];
    elements.setAttribute("data-name", elementsData[index]);

    wrapper.append(elements);
  }
});

// End

// Generating SVG Line for each Element

const elementsDataName = [
  ["Payments", "Connect"],
  ["Payments", "Terminal"],
  ["Issuing", "Treasury"],
  ["Payments", "Tax"],
  ["Payments", "Radar"],
  ["Billing", "Invoicing"],
];

// Generating SVGs inside the .container
elementsDataName.forEach((_, index) => {
  const svgContainer = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  svgContainer.classList.add("svg-lines");
  svgContainer.classList.add(`svg-lines-${index + 1}`);
  container.appendChild(svgContainer);
});

// Generating Path
function createSVGPath(startX, startY, endX, endY) {
  const svgNS = "http://www.w3.org/2000/svg";
  const path = document.createElementNS(svgNS, "path");

  // Define the path data to go straight down and then horizontally
  const pathData = `
    M ${startX} ${startY}
    L ${startX} ${endY}
    L ${endX} ${endY}
    L ${endX} ${endY}
  `;

  path.setAttribute("d", pathData);
  path.setAttribute("stroke", "orange");
  path.setAttribute("stroke-width", "3");
  path.setAttribute("fill", "none");
  path.classList.add("animate-path");

  return path;
}

// Putting the generated Path to each SVGs
function connectElements() {
  return elementsDataName.forEach((name, index) => {
    const svgContainer = document.querySelector(`.svg-lines-${index + 1}`);
    const [startName, endName] = name;

    const item1 = document.querySelector(`[data-name='${startName}']`);
    const item2 = document.querySelector(`[data-name='${endName}']`);

    // Clear previous SVG content
    svgContainer.innerHTML = "";

    // Get positions and dimensions
    const rect1 = item1.getBoundingClientRect();
    const rect2 = item2.getBoundingClientRect();

    // Calculate start and end points
    const startX = rect1.left + rect1.width / 2;
    const startY = rect1.top + rect1.height;
    const endX = rect2.left + rect2.width;
    const endY = rect2.top + rect2.height / 2;

    // Append path to SVG container
    svgContainer.appendChild(createSVGPath(startX, startY, endX, endY));
  });
}

// Draw line on window resize
window.addEventListener("resize", connectElements);

// Initial drawing
document.addEventListener("DOMContentLoaded", connectElements);

// Giving Each paths a variable (--path-length)
document.addEventListener("DOMContentLoaded", () => {
  const paths = document.querySelectorAll(".animate-path");

  paths.forEach((path) => {
    const pathLength = path.getTotalLength();

    console.log(pathLength);

    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;

    path.style.setProperty("--path-length", `${pathLength}px`);
  });
});

// This part is for managing when an animation must happen
async function animatingLine() {
  const path1 = document.querySelector(".svg-lines-1 path");
  const path2 = document.querySelector(".svg-lines-2 path");
  const path3 = document.querySelector(".svg-lines-3 path");
  const path4 = document.querySelector(".svg-lines-4 path");
  const path5 = document.querySelector(".svg-lines-5 path");
  const path6 = document.querySelector(".svg-lines-6 path");

  const paymentCard = document.querySelector("[data-name='Payments']");
  const connectCard = document.querySelector("[data-name='Connect']");
  const terminalCard = document.querySelector("[data-name='Terminal']");
  const issuingCard = document.querySelector("[data-name='Issuing']");
  const treasuryCard = document.querySelector("[data-name='Treasury']");
  const taxCard = document.querySelector("[data-name='Tax']");
  const radarCard = document.querySelector("[data-name='Radar']");
  const billingCard = document.querySelector("[data-name='Billing']");
  const invoicingCard = document.querySelector("[data-name='Invoicing']");

  while (true) {
    eachAnimation(path1, paymentCard, connectCard, "add");
    eachAnimation(path2, paymentCard, terminalCard, "add");

    await new Promise((resolve) => setTimeout(resolve, 4000));

    eachAnimation(path1, paymentCard, connectCard, "remove");
    eachAnimation(path2, paymentCard, terminalCard, "remove");

    eachAnimation(path3, issuingCard, treasuryCard, "add");

    await new Promise((resolve) => setTimeout(resolve, 4000));

    eachAnimation(path3, issuingCard, treasuryCard, "remove");

    eachAnimation(path4, paymentCard, taxCard, "add");
    eachAnimation(path5, paymentCard, radarCard, "add");

    await new Promise((resolve) => setTimeout(resolve, 4000));

    eachAnimation(path4, paymentCard, taxCard, "remove");
    eachAnimation(path5, paymentCard, radarCard, "remove");

    eachAnimation(path6, billingCard, invoicingCard, "add");

    await new Promise((resolve) => setTimeout(resolve, 4000));

    eachAnimation(path6, billingCard, invoicingCard, "remove");
  }
}

document.addEventListener("DOMContentLoaded", animatingLine);

function eachAnimation(path1, card1, card2, action) {
  if (action === "add") {
    path1.classList.add("animate-now");

    card1.classList.add("animate-now");
    card2.classList.add("animate-now-delay");
  } else if (action === "remove") {
    path1.classList.remove("animate-now");

    card1.classList.remove("animate-now");
    card2.classList.remove("animate-now-delay");
  }
}
