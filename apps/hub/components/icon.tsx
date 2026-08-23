import type { ComponentType } from "react";
import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

/**
 * Hub-local icon set.
 *
 * Every icon below defaults to its `lucide-react` counterpart. To swap an icon
 * for a custom one, replace that function's body with your own SVG — keep the
 * `{...props}` spread so `className` / `size` / `strokeWidth` keep working:
 *
 *   export function Home(props: LucideProps) {
 *     return (
 *       <svg viewBox="0 0 24 24" {...props}>
 *         ...your paths...
 *       </svg>
 *     );
 *   }
 *
 * Changing an icon here updates every usage across the Hub app at once.
 * This is scoped to Hub only — other apps still import from `lucide-react`.
 */

export type { LucideProps } from "lucide-react";

/**
 * Any icon in this file is a plain function component, so we type the shared
 * "icon" slot loosely — a component taking LucideProps. Both these wrappers and
 * real lucide icons satisfy it.
 */
export type LucideIcon = ComponentType<LucideProps>;

export function AlertTriangle(props: LucideProps) {
  return <Lucide.AlertTriangle {...props} />;
}

export function ArrowDown(props: LucideProps) {
  return <Lucide.ArrowDown {...props} />;
}

export function ArrowLeft(props: LucideProps) {
  return <Lucide.ArrowLeft {...props} />;
}

export function ArrowRight(props: LucideProps) {
  return <Lucide.ArrowRight {...props} />;
}

export function ArrowUp(props: LucideProps) {
  return <Lucide.ArrowUp {...props} />;
}

export function ArrowUpRight(props: LucideProps) {
  return <Lucide.ArrowUpRight {...props} />;
}

export function Asterisk(props: LucideProps) {
  return <Lucide.Asterisk {...props} />;
}

export function Ban(props: LucideProps) {
  return <Lucide.Ban {...props} />;
}

export function BarChart3(props: LucideProps) {
  return <Lucide.BarChart3 {...props} />;
}

export function Blocks(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>nut</title>
      <g fill="currentColor">
        <path d="M16.317,7.62l-2.465-4.25c-.49-.845-1.402-1.37-2.378-1.37H6.527c-.977,0-1.888,.525-2.379,1.37L1.683,7.62c-.493,.851-.493,1.909,0,2.76l2.465,4.25c.49,.845,1.402,1.37,2.378,1.37h4.946c.977,0,1.888-.525,2.379-1.37l2.465-4.25c.493-.851,.493-1.909,0-2.76Zm-7.317,3.63c-1.243,0-2.25-1.007-2.25-2.25s1.007-2.25,2.25-2.25,2.25,1.007,2.25,2.25-1.007,2.25-2.25,2.25Z"></path>
      </g>
    </svg>
  );
}

export function Bold(props: LucideProps) {
  return <Lucide.Bold {...props} />;
}

export function BookOpen(props: LucideProps) {
  return <Lucide.BookOpen {...props} />;
}

export function BookText(props: LucideProps) {
  return <Lucide.BookText {...props} />;
}

export function Bot(props: LucideProps) {
  return <Lucide.Bot {...props} />;
}

export function Building2(props: LucideProps) {
  return <Lucide.Building2 {...props} />;
}

export function CalendarIcon(props: LucideProps) {
  return <Lucide.CalendarIcon {...props} />;
}

export function Check(props: LucideProps) {
  return <Lucide.Check {...props} />;
}

export function ChevronDown(props: LucideProps) {
  return <Lucide.ChevronDown {...props} />;
}

export function ChevronDownIcon(props: LucideProps) {
  return <Lucide.ChevronDownIcon {...props} />;
}

export function ChevronLeft(props: LucideProps) {
  return <Lucide.ChevronLeft {...props} />;
}

export function ChevronRight(props: LucideProps) {
  return <Lucide.ChevronRight {...props} />;
}

export function ChevronsDownUp(props: LucideProps) {
  return <Lucide.ChevronsDownUp {...props} />;
}

export function ChevronsUpDown(props: LucideProps) {
  return <Lucide.ChevronsUpDown {...props} />;
}

export function ChevronUp(props: LucideProps) {
  return <Lucide.ChevronUp {...props} />;
}

export function CircleCheck(props: LucideProps) {
  return <Lucide.CircleCheck {...props} />;
}

export function CircleMinus(props: LucideProps) {
  return <Lucide.CircleMinus {...props} />;
}

export function CirclePlus(props: LucideProps) {
  return <Lucide.CirclePlus {...props} />;
}

export function CloudUpload(props: LucideProps) {
  return <Lucide.CloudUpload {...props} />;
}

export function Code(props: LucideProps) {
  return <Lucide.Code {...props} />;
}

export function Columns2(props: LucideProps) {
  return <Lucide.Columns2 {...props} />;
}

export function Columns3(props: LucideProps) {
  return <Lucide.Columns3 {...props} />;
}

export function Copy(props: LucideProps) {
  return <Lucide.Copy {...props} />;
}

export function CornerLeftUp(props: LucideProps) {
  return <Lucide.CornerLeftUp {...props} />;
}

export function CreditCard(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>credit-card</title>
      <g fill="currentColor">
        <path d="M17,5.75c0-1.517-1.233-2.75-2.75-2.75H3.75c-1.517,0-2.75,1.233-2.75,2.75v.75H17v-.75Z"></path>
        <path d="M1,12.25c0,1.517,1.233,2.75,2.75,2.75H14.25c1.517,0,2.75-1.233,2.75-2.75v-4.25H1v4.25Zm11.75-1.75h1c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75h-1c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75Zm-8.5,0h3c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75h-3c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75Z"></path>
      </g>
    </svg>
  );
}

export function Database(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>database</title>
      <g fill="currentColor">
        <path
          d="M2.75 3.5C2.33579 3.5 2 3.83579 2 4.25V8.5C2 8.92749 2.22718 9.30746 2.5867 9.62993C2.94759 9.95364 3.4632 10.2399 4.09183 10.4784C5.35093 10.9559 7.08613 11.25 9 11.25C10.9139 11.25 12.6491 10.9559 13.9082 10.4784C14.5368 10.2399 15.0524 9.95364 15.4133 9.62993C15.7728 9.30746 16 8.92749 16 8.5V4.25C16 3.83579 15.6642 3.5 15.25 3.5H2.75Z"
          fill-opacity="0.4"
        ></path>{" "}
        <path
          d="M16 11.4631C16 11.3008 15.8154 11.204 15.6767 11.2883C15.2916 11.5221 14.8709 11.7175 14.4402 11.8809C12.9714 12.438 11.0477 12.75 9 12.75C6.95227 12.75 5.02858 12.438 3.55984 11.8809C3.12912 11.7175 2.70837 11.5221 2.32335 11.2883C2.18463 11.204 2 11.3008 2 11.4631V13.75C2 14.3646 2.34809 14.8507 2.75498 15.1971C3.16484 15.546 3.71371 15.8262 4.32648 16.0468C5.55839 16.4903 7.21079 16.75 9 16.75C10.7892 16.75 12.4416 16.4903 13.6735 16.0468C14.2863 15.8262 14.8352 15.546 15.245 15.1971C15.6519 14.8507 16 14.3646 16 13.75V11.4631Z"
          fill-opacity="0.4"
        ></path>{" "}
        <path d="M4.32656 1.9532C5.55849 1.50975 7.21089 1.25 9 1.25C10.7891 1.25 12.4415 1.50975 13.6734 1.9532C14.2862 2.17378 14.8351 2.45405 15.245 2.80293C15.6519 3.14928 16 3.6354 16 4.25C16 4.8646 15.6519 5.35072 15.245 5.69707C14.8351 6.04595 14.2862 6.32622 13.6734 6.5468C12.4415 6.99025 10.7891 7.25 9 7.25C7.21089 7.25 5.55849 6.99025 4.32656 6.5468C3.71378 6.32622 3.1649 6.04595 2.75502 5.69707C2.34812 5.35072 2 4.8646 2 4.25C2 3.6354 2.34812 3.14928 2.75502 2.80293C3.1649 2.45405 3.71378 2.17378 4.32656 1.9532Z"></path>
      </g>
    </svg>
  );
}

export function Ellipsis(props: LucideProps) {
  return <Lucide.Ellipsis {...props} />;
}

export function EllipsisVertical(props: LucideProps) {
  return <Lucide.EllipsisVertical {...props} />;
}

export function ExternalLink(props: LucideProps) {
  return <Lucide.ExternalLink {...props} />;
}

export function Eye(props: LucideProps) {
  return <Lucide.Eye {...props} />;
}

export function EyeOff(props: LucideProps) {
  return <Lucide.EyeOff {...props} />;
}

export function File(props: LucideProps) {
  return <Lucide.File {...props} />;
}

export function FileArchive(props: LucideProps) {
  return <Lucide.FileArchive {...props} />;
}

export function FileAudio(props: LucideProps) {
  return <Lucide.FileAudio {...props} />;
}

export function FileClock(props: LucideProps) {
  return <Lucide.FileClock {...props} />;
}

export function FileCode(props: LucideProps) {
  return <Lucide.FileCode {...props} />;
}

export function FileDown(props: LucideProps) {
  return <Lucide.FileDown {...props} />;
}

export function FileIcon(props: LucideProps) {
  return <Lucide.FileIcon {...props} />;
}

export function FileImage(props: LucideProps) {
  return <Lucide.FileImage {...props} />;
}

export function FileSpreadsheet(props: LucideProps) {
  return <Lucide.FileSpreadsheet {...props} />;
}

export function FileStack(props: LucideProps) {
  return <Lucide.FileStack {...props} />;
}

export function FileText(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>folder</title>
      <g fill="currentColor">
        <path
          d="M1.5 6.5H16.5V13.25C16.5 14.7692 15.2692 16 13.75 16H4.25C2.73079 16 1.5 14.7692 1.5 13.25V6.5Z"
          fill-opacity="0.4"
        ></path>{" "}
        <path d="M4.25 2C2.73079 2 1.5 3.23079 1.5 4.75V6.5H16.5V6.25C16.5 4.73079 15.2692 3.5 13.75 3.5H8.72395L8.34569 3.02827C7.82347 2.37825 7.03552 2 6.201 2H4.25Z"></path>
      </g>
    </svg>
  );
}

export function FileType(props: LucideProps) {
  return <Lucide.FileType {...props} />;
}

export function FileVideo(props: LucideProps) {
  return <Lucide.FileVideo {...props} />;
}

export function Folder(props: LucideProps) {
  return <Lucide.Folder {...props} />;
}

export function FolderOpen(props: LucideProps) {
  return <Lucide.FolderOpen {...props} />;
}

export function FolderPlus(props: LucideProps) {
  return <Lucide.FolderPlus {...props} />;
}

export function Frame(props: LucideProps) {
  return <Lucide.Frame {...props} />;
}

export function Gift(props: LucideProps) {
  return <Lucide.Gift {...props} />;
}

export function GitBranch(props: LucideProps) {
  return <Lucide.GitBranch {...props} />;
}

export function Globe(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>earth</title>
      <g fill="currentColor">
        <path d="M12.955,3.741c.204,.033,.414-.022,.577-.149l.153-.119c-1.264-1.073-2.898-1.722-4.685-1.722C5.838,1.75,3.156,3.778,2.165,6.601c.682,1.534,1.562,2.732,2.649,3.526l.238,.169c.089,.062,.176,.123,.26,.185,.008,.006,.016,.012,.023,.018,.294,.22,.549,.461,.678,.819,.094,.262,.083,.47,.068,.733-.021,.393-.049,.881,.292,1.447,.313,.52,.718,.733,1.014,.889,.226,.119,.33,.178,.426,.323,.279,.418,.139,1.06,.066,1.316-.012,.043-.024,.082-.037,.125,.378,.061,.762,.101,1.157,.101,3.08,0,5.705-1.924,6.756-4.634-.483-1.093-1.095-1.707-1.865-1.853-.814-.154-1.425,.274-1.918,.618-.416,.289-.686,.468-.959,.413-.157-.029-.231-.102-.48-.401-.232-.278-.55-.66-1.092-.978-.881-.516-1.975-.648-3.259-.395-.127-.359-.222-.881,.022-1.376,.053-.107,.343-.65,.871-.796,.418-.116,.823,.082,1.249,.291,.477,.234,1.129,.554,1.759,.154,.706-.45,.629-1.294,.567-1.973-.045-.49-.096-1.046,.124-1.32,.271-.339,1.067-.434,2.181-.259Z"></path>
        <path d="M9,17c-4.411,0-8-3.589-8-8S4.589,1,9,1s8,3.589,8,8-3.589,8-8,8Zm0-14.5c-3.584,0-6.5,2.916-6.5,6.5s2.916,6.5,6.5,6.5,6.5-2.916,6.5-6.5-2.916-6.5-6.5-6.5Z"></path>
      </g>
    </svg>
  );
}

export function GripVertical(props: LucideProps) {
  return <Lucide.GripVertical {...props} />;
}

export function Heading1(props: LucideProps) {
  return <Lucide.Heading1 {...props} />;
}

export function Heading2(props: LucideProps) {
  return <Lucide.Heading2 {...props} />;
}

export function Heading3(props: LucideProps) {
  return <Lucide.Heading3 {...props} />;
}

export function Heart(props: LucideProps) {
  return <Lucide.Heart {...props} />;
}

export function HelpCircle(props: LucideProps) {
  return <Lucide.HelpCircle {...props} />;
}

export function Home(props: LucideProps) {
  return <Lucide.Home {...props} />;
}

export function House(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>house-9</title>
      <g fill="currentColor">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M10.0591 1.36312C9.4333 0.886569 8.56694 0.887445 7.94127 1.36281L2.69155 5.3526C2.2559 5.68346 2 6.19867 2 6.746V14.25C2 15.7692 3.23079 17 4.75 17H13.25C14.7692 17 16 15.7692 16 14.25V6.746C16 6.20008 15.7448 5.68398 15.3088 5.35287L10.0591 1.36312Z"
          fill-opacity="0.4"
        ></path>{" "}
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M5.81867 11.6217C6.11156 11.3288 6.58644 11.3288 6.87933 11.6217C8.05044 12.7928 9.95056 12.7928 11.1217 11.6217C11.4146 11.3288 11.8894 11.3288 12.1823 11.6217C12.4752 11.9146 12.4752 12.3894 12.1823 12.6823C10.4254 14.4392 7.57556 14.4392 5.81867 12.6823C5.52578 12.3894 5.52578 11.9146 5.81867 11.6217Z"
        ></path>
      </g>
    </svg>
  );
}

export function Image(props: LucideProps) {
  return <Lucide.Image {...props} />;
}

export function ImageOff(props: LucideProps) {
  return <Lucide.ImageOff {...props} />;
}

export function Italic(props: LucideProps) {
  return <Lucide.Italic {...props} />;
}

export function KeyRound(props: LucideProps) {
  return <Lucide.KeyRound {...props} />;
}

export function LayoutGrid(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>window-layout</title>
      <g fill="currentColor">
        <path d="M14.2501 2H3.75009C2.23349 2 1.00009 3.2334 1.00009 4.75V7H17.0001V4.75C17.0001 3.2334 15.7667 2 14.2501 2ZM3.50009 5.5C2.94779 5.5 2.50009 5.0522 2.50009 4.5C2.50009 3.9478 2.94779 3.5 3.50009 3.5C4.05239 3.5 4.50009 3.9478 4.50009 4.5C4.50009 5.0522 4.05229 5.5 3.50009 5.5ZM6.50009 5.5C5.94779 5.5 5.50009 5.0522 5.50009 4.5C5.50009 3.9478 5.94779 3.5 6.50009 3.5C7.05239 3.5 7.50009 3.9478 7.50009 4.5C7.50009 5.0522 7.05229 5.5 6.50009 5.5Z"></path>{" "}
        <path
          d="M6.00009 7H1.00009V13.25C1.00009 14.7686 2.23139 16 3.75009 16H6.00009V7Z"
          fill-opacity="0.2"
        ></path>{" "}
        <path
          d="M6 7L6 16H14.2501C15.7689 16 17.0001 14.7686 17.0001 13.25V7H6Z"
          fill-opacity="0.4"
        ></path>
      </g>
    </svg>
  );
}

export function Link(props: LucideProps) {
  return <Lucide.Link {...props} />;
}

export function Link2(props: LucideProps) {
  return <Lucide.Link2 {...props} />;
}

export function List(props: LucideProps) {
  return <Lucide.List {...props} />;
}

export function ListOrdered(props: LucideProps) {
  return <Lucide.ListOrdered {...props} />;
}

export function Loader(props: LucideProps) {
  return <Lucide.Loader {...props} />;
}

export function Loader2(props: LucideProps) {
  return <Lucide.Loader2 {...props} />;
}

export function Lock(props: LucideProps) {
  return <Lucide.Lock {...props} />;
}

export function LockKeyhole(props: LucideProps) {
  return <Lucide.LockKeyhole {...props} />;
}

export function LockOpen(props: LucideProps) {
  return <Lucide.LockOpen {...props} />;
}

export function LogOut(props: LucideProps) {
  return <Lucide.LogOut {...props} />;
}

export function Mail(props: LucideProps) {
  return <Lucide.Mail {...props} />;
}

export function Maximize2(props: LucideProps) {
  return <Lucide.Maximize2 {...props} />;
}

export function Minimize2(props: LucideProps) {
  return <Lucide.Minimize2 {...props} />;
}

export function Minus(props: LucideProps) {
  return <Lucide.Minus {...props} />;
}

export function Monitor(props: LucideProps) {
  return <Lucide.Monitor {...props} />;
}

export function MonitorSmartphone(props: LucideProps) {
  return <Lucide.MonitorSmartphone {...props} />;
}

export function Tablet(props: LucideProps) {
  return <Lucide.Tablet {...props} />;
}

export function Smartphone(props: LucideProps) {
  return <Lucide.Smartphone {...props} />;
}

export function MoreHorizontal(props: LucideProps) {
  return <Lucide.MoreHorizontal {...props} />;
}

export function MousePointerClick(props: LucideProps) {
  return <Lucide.MousePointerClick {...props} />;
}

export function Newspaper(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>post</title>
      <g fill="currentColor">
        <path
          d="m13.25,2H4.75c-1.5166,0-2.75,1.2334-2.75,2.75v8.5c0,1.5166,1.2334,2.75,2.75,2.75h8.5c1.5166,0,2.75-1.2334,2.75-2.75V4.75c0-1.5166-1.2334-2.75-2.75-2.75Zm-7.25,3c.5523,0,1,.4478,1,1s-.4477,1-1,1-1-.4478-1-1,.4478-1,1-1Zm3.25,8h-3.5c-.4141,0-.75-.3359-.75-.75s.3359-.75.75-.75h3.5c.4141,0,.75.3359.75.75s-.3359.75-.75.75Zm3-3h-6.5c-.4141,0-.75-.3359-.75-.75s.3359-.75.75-.75h6.5c.4141,0,.75.3359.75.75s-.3359.75-.75.75Z"
          stroke-width="0"
        ></path>
      </g>
    </svg>
  );
}

export function NotebookPen(props: LucideProps) {
  return <Lucide.NotebookPen {...props} />;
}

export function PanelRight(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>split-view</title>
      <g fill="currentColor">
        <path
          d="m13.75,2.5H4.25c-1.5166,0-2.75,1.2334-2.75,2.75v7.5c0,1.5166,1.2334,2.75,2.75,2.75h9.5c1.5166,0,2.75-1.2334,2.75-2.75v-7.5c0-1.5166-1.2334-2.75-2.75-2.75ZM3,12.75v-7.5c0-.6895.5605-1.25,1.25-1.25h4.75v10h-4.75c-.6895,0-1.25-.5605-1.25-1.25Z"
          stroke-width="0"
        ></path>
      </g>
    </svg>
  );
}

export function Pencil(props: LucideProps) {
  return <Lucide.Pencil {...props} />;
}

export function PenLine(props: LucideProps) {
  return <Lucide.PenLine {...props} />;
}

export function Phone(props: LucideProps) {
  return <Lucide.Phone {...props} />;
}

export function PictureInPicture2(props: LucideProps) {
  return <Lucide.PictureInPicture2 {...props} />;
}

export function Pilcrow(props: LucideProps) {
  return <Lucide.Pilcrow {...props} />;
}

export function Plus(props: LucideProps) {
  return <Lucide.Plus {...props} />;
}

export function Quote(props: LucideProps) {
  return <Lucide.Quote {...props} />;
}

export function RefreshCcw(props: LucideProps) {
  return <Lucide.RefreshCcw {...props} />;
}

export function RefreshCw(props: LucideProps) {
  return <Lucide.RefreshCw {...props} />;
}

export function RemoveFormatting(props: LucideProps) {
  return <Lucide.RemoveFormatting {...props} />;
}

export function RotateCw(props: LucideProps) {
  return <Lucide.RotateCw {...props} />;
}

export function Rows3(props: LucideProps) {
  return <Lucide.Rows3 {...props} />;
}

export function Save(props: LucideProps) {
  return <Lucide.Save {...props} />;
}

export function Search(props: LucideProps) {
  return <Lucide.Search {...props} />;
}

export function Send(props: LucideProps) {
  return <Lucide.Send {...props} />;
}

export function Settings(props: LucideProps) {
  return <Lucide.Settings {...props} />;
}

export function Settings2(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>quick-actions</title>
      <g fill="currentColor">
        <path
          d="m15.4248,6.5708s-.0005,0-.0005-.0005l-.6143-.2163c-.0879-.1968-.1792-.3779-.2773-.5483-.0977-.1689-.2085-.3394-.3364-.5151l.1191-.6401c.1831-.9824-.2754-1.978-1.1396-2.4761l-.3511-.2036c-.8657-.5005-1.957-.3994-2.7158.2505l-.4937.4219c-.4082-.041-.8198-.0396-1.231.0005l-.4941-.4233c-.7598-.6509-1.8516-.7505-2.7158-.2505l-.3496.2021c-.8657.499-1.3242,1.4946-1.1411,2.478l.1196.6392c-.2397.3345-.4458.6909-.6157,1.0649l-.6118.2153c-.9424.3325-1.5757,1.2271-1.5757,2.2266v.4053c0,.9995.6333,1.894,1.5757,2.2266l.6143.2163c.0884.1987.1807.3804.2783.5493.0981.1689.209.3389.3354.5127l-.1201.6416c-.1831.9824.2754,1.978,1.1396,2.4761l.3511.2036c.8652.4995,1.957.3989,2.7163-.2505l.4937-.4229c.4067.0391.8174.0396,1.228-.0005l.4951.4243c.4375.3745.9854.5669,1.5361.5669.4058,0,.814-.1045,1.1807-.3169l.3496-.2026c.8652-.499,1.3237-1.4946,1.1406-2.4771l-.1196-.6406c.2402-.3359.4463-.6919.6152-1.0635l.6123-.2153c.9424-.3325,1.5757-1.2271,1.5757-2.2266v-.4053c0-.999-.6323-1.8936-1.5732-2.2261Zm-4.1631,2.4136l-2.1924,3.125c-.1206.1719-.314.2656-.5122.2656-.1011,0-.2031-.0244-.2974-.0752-.2793-.1514-.4004-.4883-.2822-.7832l.6104-1.5166h-1.3379c-.2334,0-.4468-.1299-.5547-.3369-.1074-.207-.0908-.4561.043-.6475l2.1924-3.125c.1812-.2598.5303-.3418.8096-.1904s.4004.4883.2822.7832l-.6104,1.5166h1.3379c.2334,0,.4473.1299.5547.3369s.0908.4561-.043.6475Z"
          stroke-width="0"
        ></path>
      </g>
    </svg>
  );
}

export function SlidersHorizontal(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>carousel</title>
      <g fill="currentColor">
        <path
          opacity="0.4"
          d="M3.00012 13.25V4.75C3.00012 4.312 3.08572 3.8979 3.20932 3.5H2.75012C1.50942 3.5 0.500122 4.5093 0.500122 5.75V12.25C0.500122 13.4907 1.50942 14.5 2.75012 14.5H3.20932C3.08572 14.1021 3.00012 13.688 3.00012 13.25Z"
        ></path>{" "}
        <path
          opacity="0.4"
          d="M15.0001 13.25V4.75C15.0001 4.312 14.9145 3.8979 14.7909 3.5H15.2501C16.4908 3.5 17.5001 4.5093 17.5001 5.75V12.25C17.5001 13.4907 16.4908 14.5 15.2501 14.5H14.7909C14.9145 14.1021 15.0001 13.688 15.0001 13.25Z"
        ></path>{" "}
        <path d="M10.7501 2H7.25012C5.73134 2 4.50012 3.23122 4.50012 4.75V13.25C4.50012 14.7688 5.73134 16 7.25012 16H10.7501C12.2689 16 13.5001 14.7688 13.5001 13.25V4.75C13.5001 3.23122 12.2689 2 10.7501 2Z"></path>
      </g>
    </svg>
  );
}

export function Sparkles(props: LucideProps) {
  return <Lucide.Sparkles {...props} />;
}

export function Strikethrough(props: LucideProps) {
  return <Lucide.Strikethrough {...props} />;
}

export function Table(props: LucideProps) {
  return <Lucide.Table {...props} />;
}

export function Table2(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      {...props}
    >
      <title>database</title>
      <g fill="currentColor">
        <path
          d="M2.75 3.5C2.33579 3.5 2 3.83579 2 4.25V8.5C2 8.92749 2.22718 9.30746 2.5867 9.62993C2.94759 9.95364 3.4632 10.2399 4.09183 10.4784C5.35093 10.9559 7.08613 11.25 9 11.25C10.9139 11.25 12.6491 10.9559 13.9082 10.4784C14.5368 10.2399 15.0524 9.95364 15.4133 9.62993C15.7728 9.30746 16 8.92749 16 8.5V4.25C16 3.83579 15.6642 3.5 15.25 3.5H2.75Z"
          fill-opacity="0.4"
        ></path>{" "}
        <path
          d="M16 11.4631C16 11.3008 15.8154 11.204 15.6767 11.2883C15.2916 11.5221 14.8709 11.7175 14.4402 11.8809C12.9714 12.438 11.0477 12.75 9 12.75C6.95227 12.75 5.02858 12.438 3.55984 11.8809C3.12912 11.7175 2.70837 11.5221 2.32335 11.2883C2.18463 11.204 2 11.3008 2 11.4631V13.75C2 14.3646 2.34809 14.8507 2.75498 15.1971C3.16484 15.546 3.71371 15.8262 4.32648 16.0468C5.55839 16.4903 7.21079 16.75 9 16.75C10.7892 16.75 12.4416 16.4903 13.6735 16.0468C14.2863 15.8262 14.8352 15.546 15.245 15.1971C15.6519 14.8507 16 14.3646 16 13.75V11.4631Z"
          fill-opacity="0.4"
        ></path>{" "}
        <path d="M4.32656 1.9532C5.55849 1.50975 7.21089 1.25 9 1.25C10.7891 1.25 12.4415 1.50975 13.6734 1.9532C14.2862 2.17378 14.8351 2.45405 15.245 2.80293C15.6519 3.14928 16 3.6354 16 4.25C16 4.8646 15.6519 5.35072 15.245 5.69707C14.8351 6.04595 14.2862 6.32622 13.6734 6.5468C12.4415 6.99025 10.7891 7.25 9 7.25C7.21089 7.25 5.55849 6.99025 4.32656 6.5468C3.71378 6.32622 3.1649 6.04595 2.75502 5.69707C2.34812 5.35072 2 4.8646 2 4.25C2 3.6354 2.34812 3.14928 2.75502 2.80293C3.1649 2.45405 3.71378 2.17378 4.32656 1.9532Z"></path>
      </g>
    </svg>
  );
}

export function TextCursorInput(props: LucideProps) {
  return <Lucide.TextCursorInput {...props} />;
}

export function Trash2(props: LucideProps) {
  return <Lucide.Trash2 {...props} />;
}

export function TrendingUp(props: LucideProps) {
  return <Lucide.TrendingUp {...props} />;
}

export function TriangleAlert(props: LucideProps) {
  return <Lucide.TriangleAlert {...props} />;
}

export function Underline(props: LucideProps) {
  return <Lucide.Underline {...props} />;
}

export function Upload(props: LucideProps) {
  return <Lucide.Upload {...props} />;
}

export function UploadCloud(props: LucideProps) {
  return <Lucide.UploadCloud {...props} />;
}

export function Users(props: LucideProps) {
  return <Lucide.Users {...props} />;
}

export function X(props: LucideProps) {
  return <Lucide.X {...props} />;
}
