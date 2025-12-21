export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export async function geocodeCity(
  city: string,
  state: string
): Promise<{ latitude: number; longitude: number } | null> {
  const cityCoordinates: Record<
    string,
    { latitude: number; longitude: number }
  > = {
    'detroit,mi': { latitude: 42.3314, longitude: -83.0458 },
    'grosse pointe park,mi': { latitude: 42.3761, longitude: -82.9375 },
    'grosse pointe,mi': { latitude: 42.3861, longitude: -82.9118 },
    'grosse pointe farms,mi': { latitude: 42.4086, longitude: -82.8961 },
    'grosse pointe woods,mi': { latitude: 42.4436, longitude: -82.8966 },
    'grosse pointe shores,mi': { latitude: 42.4328, longitude: -82.8757 },
  };

  const key = `${city.toLowerCase()},${state.toLowerCase()}`;
  return cityCoordinates[key] || null;
}
