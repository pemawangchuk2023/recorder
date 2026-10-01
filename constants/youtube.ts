// What YouTube accepts and recommends, for the "Ready for YouTube" checks
// and the files prepared for YouTube Studio. Nothing here talks to YouTube.

export const YOUTUBE_TITLE_MAX = 100;
export const YOUTUBE_DESCRIPTION_MAX = 5000;
export const YOUTUBE_TAGS_MAX = 500;
// Custom thumbnails: 1280×720, JPEG or PNG, under 2 MB.
export const YOUTUBE_THUMBNAIL_WIDTH = 1280;
export const YOUTUBE_THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;
// Vertical or square videos up to this long are published as Shorts.
export const YOUTUBE_SHORTS_MAX_SECONDS = 180;
// Accounts that haven't verified by phone can only upload up to 15 minutes.
export const YOUTUBE_UNVERIFIED_MAX_SECONDS = 15 * 60;
// Anything shorter than 720p shows as SD on YouTube.
export const YOUTUBE_HD_MIN_HEIGHT = 720;
