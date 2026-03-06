export type StampType = 'scenic' | 'station' | 'goshuin';

export interface Stamp {
  id: string;
  name: string;
  type: StampType;
  description: string;
  lat: number;
  lng: number;
  imageUrl: string;
  address: string;
}

export const INITIAL_STAMPS: Stamp[] = [
  {
    id: 'tokyo-station',
    name: '东京站 车站印',
    type: 'station',
    description: '位于丸之内南口检票口外。以红砖站舍图案闻名的经典车站印章。',
    lat: 35.681236,
    lng: 139.767125,
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=tokyo&backgroundColor=c0aede',
    address: '东京都千代田区丸之内1-9-1'
  },
  {
    id: 'asakusa-scenic',
    name: '浅草邮局 风景印',
    type: 'scenic',
    description: '绘制有雷门和浅草寺五重塔的精美风景印。工作日9点至17点在窗口可盖。',
    lat: 35.711802,
    lng: 139.796677,
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=asakusa&backgroundColor=b6e3f4',
    address: '东京都台东区雷门2-2-1'
  },
  {
    id: 'kanda-goshuin',
    name: '神田明神 御朱印',
    type: 'goshuin',
    description: '守护江户总镇守的霸气御朱印。初穗料500日元。',
    lat: 35.702047,
    lng: 139.767936,
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=kanda&backgroundColor=f1f4dc',
    address: '东京都千代田区外神田2-16-2'
  },
  {
    id: 'ueno-station',
    name: '上野站 车站印',
    type: 'station',
    description: '有着上野公园和熊猫图案的可爱印章。入谷检票口外可盖。',
    lat: 35.713768,
    lng: 139.777254,
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=ueno&backgroundColor=ffdfbf',
    address: '东京都台东区上野7-1-1'
  }
];
