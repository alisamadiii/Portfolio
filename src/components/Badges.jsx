// Made by Ali Reza
// Twitter: @Ali_Developer05
// Email: webdeve1083@gmail.com

// Icons from react-icons
import { AiFillHtml5 } from "react-icons/ai";
import { DiCss3, DiNodejsSmall, DiJqueryLogo, DiRuby } from "react-icons/di";
import {
  SiJavascript,
  SiNextdotjs,
  SiTailwindcss,
  SiExpress,
  SiGraphql,
  SiMongodb,
  SiPostgresql,
  SiJava,
  SiMysql,
  SiRubyonrails,
  SiRedux,
  SiFirebase,
} from "react-icons/si";
import { IoLogoSass } from "react-icons/io";
import { FaReact, FaPython, FaAngular } from "react-icons/fa";
import { FiFigma } from "react-icons/fi";

// Badges details
const BADGES = [
  {
    inputName: "html",
    icon: <AiFillHtml5 />,
    technology: "HTML",
    color: "ff7816",
  },
  {
    inputName: "css",
    icon: <DiCss3 />,
    technology: "CSS",
    color: "2196f3",
  },
  {
    inputName: "js",
    icon: <SiJavascript />,
    technology: "JavaScript",
    color: "f0db4f",
  },
  {
    inputName: "sass",
    icon: <IoLogoSass />,
    technology: "SASS",
    color: "cc6699",
  },
  {
    inputName: "reactjs",
    icon: <FaReact />,
    technology: "ReactJS",
    color: "61DBFB",
  },
  {
    inputName: "nextjs",
    icon: <SiNextdotjs />,
    technology: "NextJS",
    color: "212121",
  },
  {
    inputName: "figma",
    icon: <FiFigma />,
    technology: "Figma",
    color: "FF4D12",
  },
  {
    inputName: "tailwindcss",
    icon: <SiTailwindcss />,
    technology: "TailwindCSS",
    color: "07B6D5",
  },
  {
    inputName: "expressjs",
    icon: <SiExpress />,
    technology: "ExpressJS",
    color: "000",
  },
  {
    inputName: "nodejs",
    icon: <DiNodejsSmall />,
    technology: "NodeJS",
    color: "3C873A",
  },
  {
    inputName: "graphql",
    icon: <SiGraphql />,
    technology: "Graphql",
    color: "E10098",
  },
  {
    inputName: "python",
    icon: <FaPython />,
    technology: "Python",
    color: "3671A1",
  },
  {
    inputName: "mongodb",
    icon: <SiMongodb />,
    technology: "MongoDB",
    color: "3FA037",
  },
  {
    inputName: "angular",
    icon: <FaAngular />,
    technology: "Angular",
    color: "B52E31",
  },
  {
    inputName: "jquery",
    icon: <DiJqueryLogo />,
    technology: "jQuery",
    color: "0868AC",
  },
  {
    inputName: "postgresql",
    icon: <SiPostgresql />,
    technology: "PostgreSQL",
    color: "336791",
  },
  {
    inputName: "java",
    icon: <SiJava />,
    technology: "Java",
    color: "DB380E",
  },
  {
    inputName: "mysql",
    icon: <SiMysql />,
    technology: "MySQL",
    color: "5181A2",
  },
  {
    inputName: "ruby",
    icon: <DiRuby />,
    technology: "Ruby",
    color: "8F171B",
  },
  {
    inputName: "rails",
    icon: <SiRubyonrails />,
    technology: "Rails",
    color: "cc0000",
  },
  {
    inputName: "redux",
    icon: <SiRedux />,
    technology: "Redux",
    color: "764abc",
  },
  {
    inputName: "firebase",
    icon: <SiFirebase />,
    technology: "Firebase",
    color: "FFA611",
  },
];

const Badge = ({ technology }) => {
  const finding = BADGES.find((badge) => badge.inputName == technology);
  return (
    <button
      style={{ borderColor: `#${finding.color}` }}
      className="flex items-center gap-1 md:gap-2 py-1 px-2 rounded-[4px] text-[8px] md:text-xs border-2 font-medium">
      <span
        className="text-sm md:text-lg"
        style={{ color: `#${finding.color}` }}>
        {finding?.icon}
      </span>
      {finding.technology}
    </button>
  );
};

export default Badge;
