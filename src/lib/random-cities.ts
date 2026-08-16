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
  "Cairo, Egypt",
  "Panipat, India",
  "Beijing, China",
  "Dungarvan, Ireland",
  "Berlin, Germany",
  "Bali, Indonesia",
  "Nuuk, Greenland",
  "Moscow, Russia",
  "Grand Canyon, USA",
  "Las Vegas, USA",
  "Kufra, Libya",
  "Windhoek, Namibia",
  "Algiers, Algeria",
  "New York, USA",
  "Los Angeles, USA",
  "Hammerfest, Norway",
  "Tripoli, Libya",
  "Doha, Qatar",
  "Kananga, DR Congo",
  "Porto Velho, Brazil",
  "Ha, Bhutan",
  "Lima, Peru",
  "Ushuaia, Argentina",
  "Perth, Australia",
  "Sichuan, China",
  "Kuala Lumpur, Malaysia",
];

export function pickRandomCity(): string {
  return CITIES[Math.floor(Math.random() * CITIES.length)]!;
}

/**
 * Fixed, not sampled from `CITIES`: the first-run row has to hold still between
 * renders. Four time zones, so one of them is always in the night cascade.
 */
export const STARTER_CITIES = [
  { label: "Tokyo", query: "Tokyo, Japan" },
  { label: "Lisbon", query: "Lisbon, Portugal" },
  { label: "Reykjavík", query: "Reykjavik, Iceland" },
  { label: "New York", query: "New York, USA" },
] as const;
