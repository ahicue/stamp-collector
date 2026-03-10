import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'post.japanpost.jp' },
      { protocol: 'https', hostname: 'www.post.japanpost.jp' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'minimized.hotokami.jp' },
      { protocol: 'https', hostname: 'contents.hotokami.jp' },
      { protocol: 'https', hostname: 'hotokami-post.s3.amazonaws.com' },
    ],
  },
};

export default nextConfig;
