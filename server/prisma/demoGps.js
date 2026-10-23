// Približné GPS demo záhrad: stred obce + malý posun, aby špendlíky neležali na sebe.
const CITY_CENTERS = {
  Poprad: [49.0565, 20.2978],
  Svit: [49.0546, 20.2025],
  Kežmarok: [49.1373, 20.4283],
  "Spišská Sobota": [49.0638, 20.3235],
  "Veľká Lomnica": [49.1155, 20.3578],
  Batizovce: [49.0716, 20.1923],
  "Stará Lesná": [49.1519, 20.2891],
};

export function demoGps(city, index) {
  const center = CITY_CENTERS[city];
  if (!center) return {};
  const angle = index * 2.4;
  const distance = 0.003 + (index % 4) * 0.0015;
  return {
    latitude: Number((center[0] + Math.sin(angle) * distance).toFixed(6)),
    longitude: Number((center[1] + Math.cos(angle) * distance * 1.5).toFixed(6)),
  };
}
