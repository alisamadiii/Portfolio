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

export function Blocks(props: LucideProps) {
  return <Lucide.Blocks {...props} />;
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
  return <Lucide.CreditCard {...props} />;
}

export function Database(props: LucideProps) {
  return <Lucide.Database {...props} />;
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
  return <Lucide.FileText {...props} />;
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
  return <Lucide.Globe {...props} />;
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
  return <Lucide.House {...props} />;
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
  return <Lucide.LayoutGrid {...props} />;
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
  return <Lucide.Newspaper {...props} />;
}

export function NotebookPen(props: LucideProps) {
  return <Lucide.NotebookPen {...props} />;
}

export function PanelRight(props: LucideProps) {
  return <Lucide.PanelRight {...props} />;
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
  return <Lucide.Settings2 {...props} />;
}

export function SlidersHorizontal(props: LucideProps) {
  return <Lucide.SlidersHorizontal {...props} />;
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
  return <Lucide.Table2 {...props} />;
}

export function TextCursorInput(props: LucideProps) {
  return <Lucide.TextCursorInput {...props} />;
}

export function Trash2(props: LucideProps) {
  return <Lucide.Trash2 {...props} />;
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

