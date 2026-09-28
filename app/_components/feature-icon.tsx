import {
  AudioWaveform,
  Captions,
  Keyboard,
  Lock,
  MonitorPlay,
  Music,
  Repeat2,
  Scissors,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { FeatureIconName } from "@/constants/home";
import { cn } from "@/lib/utils";

const ICONS: Record<FeatureIconName, LucideIcon> = {
  screen: MonitorPlay,
  music: Music,
  camera: Video,
  captions: Captions,
  lock: Lock,
  scissors: Scissors,
  convert: Repeat2,
  zap: Zap,
  keyboard: Keyboard,
  wave: AudioWaveform,
};

export function FeatureIcon({ name, className }: { name: FeatureIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={cn("size-6", className)} aria-hidden="true" />;
}
