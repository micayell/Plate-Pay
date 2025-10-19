export type Partner = {
  id: string;
  name: string;
  dis: number;
  addr: string;
  lat: number;
  lng: number;
  price?: number;
};

export const PARTNERS: Partner[] = [
  {
    id: 'p1',
    name: '하남2지구 임시공영주차장',
    dis: 60,
    addr: '광주광역시 광산구 오선동 549-1',
    lat: 37.4979,
    lng: 127.0276,
    price: 2000,
  },
  {
    id: 'p2',
    name: '하남2지구 임시공영주차장',
    dis: 60,
    addr: '광주광역시 광산구 오선동 549-1',
    lat: 37.5665,
    lng: 126.978,
    price: 2000,
  },
  {
    id: 'p3',
    name: '하남2지구 임시공영주차장',
    dis: 60,
    addr: '광주광역시 광산구 오선동 549-1',
    lat: 37.504,
    lng: 127.024,
    price: 2000,
  },
  {
    id: 'p4',
    name: '하남2지구 임시공영주차장',
    dis: 60,
    addr: '광주광역시 광산구 오선동 549-1',
    lat: 37.51,
    lng: 127.03,
    price: 2000,
  },
];
