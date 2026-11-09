import type { ScreenArea } from "@/app/recorder/_lib/types";

// The largest part of an area, centred in it, whose shape is targetAspect
// (width ÷ height) — so that part fills the target edge to edge.
export function coverArea(area: ScreenArea, screenAspect: number, targetAspect: number): ScreenArea {
  const areaAspect = (area.width * screenAspect) / area.height;
  const width = areaAspect > targetAspect ? (area.height * targetAspect) / screenAspect : area.width;
  const height = areaAspect > targetAspect ? area.height : (area.width * screenAspect) / targetAspect;
  return {
    x: area.x + (area.width - width) / 2,
    y: area.y + (area.height - height) / 2,
    width,
    height,
  };
}

// Resizes a box from one corner, keeping its shape: the opposite corner stays
// put and the box stays on the screen and no smaller than minSize either way.
// ratio is the box's width ÷ height as fractions of the screen.
export function resizeKeepingShape(
  fixed: { x: number; y: number },
  point: { x: number; y: number },
  corner: { west: boolean; north: boolean },
  ratio: number,
  minSize: number
): ScreenArea {
  const { west, north } = corner;
  const wanted = Math.max(
    north ? fixed.y - point.y : point.y - fixed.y,
    (west ? fixed.x - point.x : point.x - fixed.x) / ratio
  );
  const smallest = Math.max(minSize, minSize / ratio);
  const largest = Math.min(north ? fixed.y : 1 - fixed.y, (west ? fixed.x : 1 - fixed.x) / ratio);
  const height = Math.min(largest, Math.max(smallest, wanted));
  const width = height * ratio;
  return {
    x: west ? fixed.x - width : fixed.x,
    y: north ? fixed.y - height : fixed.y,
    width,
    height,
  };
}
