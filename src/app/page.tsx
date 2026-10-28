import type { Metadata } from "next";
import "./home.css";

export const metadata: Metadata = { title: "Ahicue", description: "Ahicue 的个人空间。" };

const content = "\n<div class=\"shell\">\n  <header class=\"nav\">\n    <a class=\"brand\" href=\"/\" aria-label=\"Ahicue 首页\"><span class=\"brand-mark\">a</span> ahicue.</a>\n    <nav class=\"nav-right\" aria-label=\"导航\"><span class=\"status\"><span class=\"dot\"></span> A LITTLE SPACE ONLINE</span><a href=\"/stamps\">原网站 ↗</a><a href=\"mailto:y@ahicue.com\">联系我 ↗</a></nav>\n  </header>\n  <main class=\"hero\">\n    <div class=\"copy\">\n      <div class=\"kicker\">Welcome to my corner</div>\n      <h1>Hello,<br>I'm <em>Ahicue.</em></h1>\n      <p class=\"intro\">这里是我的个人空间。<br>新内容正在路上，欢迎在这里停留片刻。</p>\n      <div class=\"actions\"><a class=\"button\" href=\"mailto:y@ahicue.com\">给我写信 <span aria-hidden=\"true\">↗</span></a><a class=\"text-link\" href=\"/stamps\">访问原网站 ↗</a></div>\n    </div>\n    <div class=\"art\" aria-hidden=\"true\"><span class=\"art-index\">01 / A LITTLE SPACE</span><div class=\"orb\"></div><div class=\"art-caption\"><span>AHICUE</span><span>THOUGHTS &amp; THINGS</span></div></div>\n  </main>\n  <footer class=\"bottom\"><div><div class=\"small-label\">Say hello</div><p>y@ahicue.com</p></div><div class=\"footer-note\">A little space of my own.</div></footer>\n</div>\n";

export default function Home() {
  return <div className="home-root" dangerouslySetInnerHTML={{ __html: content }} />;
}
