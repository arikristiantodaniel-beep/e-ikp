export const HOSPITAL_UNITS = [
  "IGD",
  "ICU,PICU",
  "NICU",
  "BOROBUDUR 1 A",
  "BOROBUDUR 1B",
  "BOROBUDUR 2",
  "BOROBUDUR 3",
  "CANDI NGAWEN",
  "CANDI PAWON",
  "CANDI SELOGRIYO",
  "CANDI MENDUT",
  "IBS",
  "POLIKLINIK",
  "VK",
  "PONEK",
  "CSSD",
  "AMBULANCE",
  "KAMAR JENAZAH",
  "IPSRS",
  "LAUNDRY",
  "GIZI",
  "PENDAFTARAN RAWAT JALAN",
  "REKAM MEDIS",
] as const;

export function getUnitLoginEmail(unit: string) {
  const username = unit
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${username}@eikp.invalid`;
}
