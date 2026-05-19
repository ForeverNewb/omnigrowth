export type Channel = "x" | "li" | "ig" | "fb" | "tt" | "yt" | "th" | "pi";

export type ChannelRules = {
  code: Channel;
  name: string;
  charLimit: number;
  paragraphStyle: "single" | "short" | "long";
  hashtags: { use: boolean; max: number };
};

export const CHANNELS: Record<Channel, ChannelRules> = {
  x: {
    code: "x",
    name: "X (Twitter)",
    charLimit: 280,
    paragraphStyle: "single",
    hashtags: { use: true, max: 2 },
  },
  li: {
    code: "li",
    name: "LinkedIn",
    charLimit: 3000,
    paragraphStyle: "short",
    hashtags: { use: true, max: 5 },
  },
  ig: {
    code: "ig",
    name: "Instagram",
    charLimit: 2200,
    paragraphStyle: "short",
    hashtags: { use: true, max: 10 },
  },
  fb: {
    code: "fb",
    name: "Facebook",
    charLimit: 63206,
    paragraphStyle: "long",
    hashtags: { use: false, max: 0 },
  },
  tt: {
    code: "tt",
    name: "TikTok",
    charLimit: 2200,
    paragraphStyle: "single",
    hashtags: { use: true, max: 5 },
  },
  yt: {
    code: "yt",
    name: "YouTube",
    charLimit: 5000,
    paragraphStyle: "long",
    hashtags: { use: true, max: 3 },
  },
  th: {
    code: "th",
    name: "Threads",
    charLimit: 500,
    paragraphStyle: "single",
    hashtags: { use: true, max: 2 },
  },
  pi: {
    code: "pi",
    name: "Pinterest",
    charLimit: 500,
    paragraphStyle: "short",
    hashtags: { use: true, max: 3 },
  },
};

export function isChannel(value: string): value is Channel {
  return value in CHANNELS;
}

export function renderChannelRules(channel: Channel): string {
  const c = CHANNELS[channel];
  const hashtagLine = c.hashtags.use
    ? `Hashtags: up to ${c.hashtags.max} relevant tags.`
    : "Hashtags: none.";
  return [
    `Channel: ${c.name}`,
    `Character limit: ${c.charLimit}.`,
    `Paragraph style: ${c.paragraphStyle}.`,
    hashtagLine,
  ].join("\n");
}
