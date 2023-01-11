import TodoIMG from "../assets/todo.png";
import AsakatsuIMG from "../assets/asakatsu.png";

export const PROJECTS = [
  {
    id: 1,
    name: "Todo Website",
    description:
      "My todo website is a simple and convenient tool for managing tasks and staying organized. With our user-friendly interface, you can easily add new tasks, mark tasks as completed.",
    tech_stacks: ["react", "tailwind", "firebase"],
    img: TodoIMG,
    github: "#",
    website: "#",
    isDone: true,
  },
  {
    id: 2,
    name: "Asakatsu Website",
    description:
      "A project where you can keep track of your goal's progress, and contribute to open source in the same time.",
    tech_stacks: ["react", "tailwind", "firebase"],
    img: AsakatsuIMG,
    github: "#",
    website: "#",
    isDone: true,
  },
  {
    id: 3,
    name: "",
    description: "",
    tech_stacks: [],
    github: "",
    website: "",
    isDone: false,
  },
];
