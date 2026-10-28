import type { Metadata } from "next";
import "./home.css";

export const metadata: Metadata = {
  title: "Ahicue — 探索未知",
  description: "Ahicue 的数字空间，探索印章地图与 SSTR 路线。",
};

export default function Home() {
  return (
    <div className="portal" id="top">
      <div className="portal-stars" aria-hidden="true" />
      <div className="portal-wrap">
        <header className="portal-header">
          <a className="portal-logo" href="/" aria-label="Ahicue 首页"><span className="logo-symbol">✳</span><span>AHICUE<span className="logo-dot">.</span></span></a>
          <nav aria-label="主导航" className="portal-nav"><a href="#worlds">探索</a><a href="/stamps">印章地图</a><a href="/sstr">SSTR</a><a href="mailto:y@ahicue.com">联系 ↗</a></nav>
        </header>
        <main>
          <section className="portal-hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <div className="portal-eyebrow"><span className="status-dot" /> A SMALL UNIVERSE OF POSSIBILITIES</div>
              <p className="hero-overline">欢迎来到 AHICUE 的世界</p>
              <h1 id="hero-title">探索<span>未知</span><br /><i>收集奇遇。</i></h1>
              <p className="hero-description">每一条路线、每一枚印章，都是通往新故事的坐标。选择你的入口，开始探索吧。</p>
              <div className="hero-actions"><a className="primary-action" href="#worlds">开启探索 <span>↗</span></a><a className="secondary-action" href="mailto:y@ahicue.com">与我联系 <span>↗</span></a></div>
            </div>
            <div className="portal-art" aria-hidden="true">
              <div className="art-halo" /><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-ring ring-three" />
              <div className="art-core"><div className="core-inner">✳</div></div><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="art-cross cross-one">✦</span><span className="art-cross cross-two">✧</span>
              <div className="art-label art-label-top">COORDINATES<br /><strong>AHICUE / 001</strong></div><div className="art-label art-label-bottom">THE JOURNEY<br /><strong>STARTS HERE ↗</strong></div>
            </div>
          </section>
          <section className="portal-worlds" id="worlds" aria-labelledby="worlds-title">
            <div className="worlds-heading"><div><div className="portal-eyebrow">✦ &nbsp; EXPLORE THE COLLECTION</div><h2 id="worlds-title">选择你的目的地<span>。</span></h2></div><p>两张地图，不同的旅程。<br />从这里出发，发现更多可能。</p></div>
            <div className="world-grid">
              <a className="world-card stamp-card" href="/stamps"><div className="card-top"><span>01 / COLLECTION</span><span className="card-arrow">↗</span></div><div className="card-icon stamp-icon" aria-hidden="true"><span>✳</span></div><div className="card-content"><div className="card-kicker">STAMP TRACKER</div><h3>印章地图</h3><p>探索各地印章，在地图与图鉴中记录你的收藏。</p><span className="card-link">进入印章世界 <span>↗</span></span></div></a>
              <a className="world-card sstr-card" href="/sstr"><div className="card-top"><span>02 / JOURNEY</span><span className="card-arrow">↗</span></div><div className="card-icon route-icon" aria-hidden="true"><span className="route-line" /><span className="route-point route-start" /><span className="route-point route-end" /><span className="route-star">✦</span></div><div className="card-content"><div className="card-kicker">SSTR 2026</div><h3>SSTR 路线地图</h3><p>挑选点位、规划路线，为下一段旅程做好准备。</p><span className="card-link">开始规划路线 <span>↗</span></span></div></a>
            </div>
          </section>
          <section className="portal-contact"><div><div className="portal-eyebrow">✦ &nbsp; KEEP IN TOUCH</div><h2>下一段奇遇，从这里开始<span>。</span></h2><p>有想法、问题，或者只是想打个招呼？欢迎来信。</p></div><a href="mailto:y@ahicue.com">y@ahicue.com <span>↗</span></a></section>
        </main>
        <footer className="portal-footer"><span>© AHICUE</span><span>MADE FOR THE CURIOUS &nbsp; ✦</span><a href="#top" aria-label="返回页面顶部">BACK TO TOP ↑</a></footer>
      </div>
    </div>
  );
}
