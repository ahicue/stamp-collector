const url = 'https://www.post.japanpost.jp/kitte_hagaki/stamp/fuke/detail.php?id=12459';
const html = await fetch(url).then((r) => r.text());
const keys = ['〒', '備考', '郵頼送付先', '所在地', '郵便局', 'stampBlock', 'stampData', '風景印'];
for (const k of keys) {
  console.log(`${k}:${html.includes(k)}`);
}

const lines = html
  .split(/\n/)
  .filter((l) => l.includes('〒') || l.includes('備考') || l.includes('所在地') || l.includes('郵便局') || l.includes('風景印'));
console.log('--- sample lines ---');
console.log(lines.slice(0, 80).join('\n'));
