// Site-wide copy and navigation, shared by the header, footer and metadata.
export const SITE_NAME = "Screen Recorder";

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/recorder", label: "Recorder" },
  { href: "/library", label: "Library" },
  { href: "/convert", label: "Converter" },
];

export const FOOTER_GROUPS: readonly { title: string; links: readonly NavLink[] }[] = [
  {
    title: "Tools",
    links: [
      { href: "/recorder", label: "Screen recorder" },
      { href: "/library", label: "Your library" },
      { href: "/convert", label: "File converter" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
];

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;
