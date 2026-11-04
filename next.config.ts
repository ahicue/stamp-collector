import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/sstr", destination: "/sstr/index.html" },
      { source: "/cosmos", destination: "/cosmos/index.html" },
      { source: "/photo", destination: "/photo/index.html" },
      { source: "/photo/100kb", destination: "/photo/100kb/index.html" },
      { source: "/photo/stitch", destination: "/photo/stitch/index.html" },
      { source: "/photo/watermark", destination: "/photo/watermark/index.html" },
      { source: "/photo/about", destination: "/photo/about/index.html" },
      { source: "/photo/crop", destination: "/photo/crop/index.html" },
      { source: "/photo/batch", destination: "/photo/batch/index.html" },
    ];
  },
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
