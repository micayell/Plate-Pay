export function haversine(a: {lat:number; lng:number}, b: {lat:number; lng:number}) {
  const toRad = (d:number)=> (d*Math.PI)/180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat/2), s2 = Math.sin(dLng/2);
  const aa = s1*s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
  return 2*R*Math.asin(Math.sqrt(aa));
}
export const fmtDist = (m?: number) =>
  m == null ? '--' : (m < 1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(1)}km`);
