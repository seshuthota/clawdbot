import type {
  EditorTheme,
  MarkdownTheme,
  SelectListTheme,
  SettingsListTheme,
} from "@mariozechner/pi-tui";
import chalk from "chalk";

const palette = {
  text: "#E8E3D5",
  dim: "#7B7F87",
  accent: "#F6C453",
  accentSoft: "#F2A65A",
  border: "#3C414B",
  userBg: "#2B2F36",
  userText: "#F3EEE0",
  systemText: "#9BA3B2",
  toolPendingBg: "#1F2A2F",
  toolSuccessBg: "#1E2D23",
  toolErrorBg: "#2F1F1F",
  toolTitle: "#F6C453",
  toolOutput: "#E1DACB",
  quote: "#8CC8FF",
  quoteBorder: "#3B4D6B",
  code: "#F0C987",
  codeBlock: "#1E232A",
  codeBorder: "#343A45",
  link: "#7DD3A5",
  error: "#F97066",
  success: "#7DD3A5",
};

const fg = (hex: string) => (text: string) => chalk.hex(hex)(text);
const bg = (hex: string) => (text: string) => chalk.bgHex(hex)(text);

export const theme = {
  fg: fg(palette.text),
  dim: fg(palette.dim),
  accent: fg(palette.accent),
  accentSoft: fg(palette.accentSoft),
  success: fg(palette.success),
  error: fg(palette.error),
  header: (text: string) => chalk.bold(fg(palette.accent)(text)),
  system: fg(palette.systemText),
  userBg: bg(palette.userBg),
  userText: fg(palette.userText),
  toolTitle: fg(palette.toolTitle),
  toolOutput: fg(palette.toolOutput),
  toolPendingBg: bg(palette.toolPendingBg),
  toolSuccessBg: bg(palette.toolSuccessBg),
  toolErrorBg: bg(palette.toolErrorBg),
  border: fg(palette.border),
  bold: (text: string) => chalk.bold(text),
  italic: (text: string) => chalk.italic(text),
};

export const markdownTheme: MarkdownTheme = {
  heading: (text: string) => chalk.bold(fg(palette.accent)(text)),
  link: (text: string) => fg(palette.link)(text),
  linkUrl: (text: string) => chalk.dim(text),
  code: (text: string) => fg(palette.code)(text),
  codeBlock: (text: string) => fg(palette.code)(text),
  codeBlockBorder: (text: string) => fg(palette.codeBorder)(text),
  quote: (text: string) => fg(palette.quote)(text),
  quoteBorder: (text: string) => fg(palette.quoteBorder)(text),
  hr: (text: string) => fg(palette.border)(text),
  listBullet: (text: string) => fg(palette.accentSoft)(text),
  bold: (text: string) => chalk.bold(text),
  italic: (text: string) => chalk.italic(text),
  strikethrough: (text: string) => chalk.strikethrough(text),
  underline: (text: string) => chalk.underline(text),
};

export const selectListTheme: SelectListTheme = {
  selectedPrefix: (text: string) => fg(palette.accent)(text),
  selectedText: (text: string) => chalk.bold(fg(palette.accent)(text)),
  description: (text: string) => fg(palette.dim)(text),
  scrollInfo: (text: string) => fg(palette.dim)(text),
  noMatch: (text: string) => fg(palette.dim)(text),
};

export const settingsListTheme: SettingsListTheme = {
  label: (text: string, selected: boolean) =>
    selected ? chalk.bold(fg(palette.accent)(text)) : fg(palette.text)(text),
  value: (text: string, selected: boolean) =>
    selected ? fg(palette.accentSoft)(text) : fg(palette.dim)(text),
  description: (text: string) => fg(palette.systemText)(text),
  cursor: fg(palette.accent)("→ "),
  hint: (text: string) => fg(palette.dim)(text),
};

export const editorTheme: EditorTheme = {
  borderColor: (text: string) => fg(palette.border)(text),
  selectList: selectListTheme,
};
