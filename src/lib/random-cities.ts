const CITIES = [
  "Tokyo, Japan",
  "Reykjavik, Iceland",
  "Cape Town, South Africa",
  "Buenos Aires, Argentina",
  "Marrakech, Morocco",
  "Kyoto, Japan",
  "Dubrovnik, Croatia",
  "Havana, Cuba",
  "Queenstown, New Zealand",
  "Tromsø, Norway",
  "Cartagena, Colombia",
  "Santorini, Greece",
  "Hanoi, Vietnam",
  "Lisbon, Portugal",
  "Nairobi, Kenya",
  "Medellín, Colombia",
  "Prague, Czech Republic",
  "Cusco, Peru",
  "Jaipur, India",
  "Vancouver, Canada",
];

export function pickRandomCity(): string {
  // CITIES is a non-empty constant array — the index is always in bounds.
  return CITIES[Math.floor(Math.random() * CITIES.length)]!;
}
