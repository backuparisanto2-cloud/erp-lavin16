const lantai1 = { url: "/assets/denah-lantai-1.jpg" };
const lantai2 = { url: "/assets/denah-lantai-2.jpg" };
const lantai3 = { url: "/assets/denah-lantai-3.jpg" };
const rooftop = { url: "/assets/denah-rooftop.jpg" };

export type FloorKey = "1" | "2" | "3" | "rooftop";

export type Hotspot = {
  id: string;
  label: string;
  type: "kamar" | "umum";
  /** nomor kamar pada tabel rooms, untuk hotspot tipe kamar */
  roomNumber?: string;
  /** kata kunci lokasi untuk mencocokkan barang fasilitas bersama */
  locationMatch?: string[];
  /** koordinat dalam persen terhadap ukuran gambar */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CropBox = { x: number; y: number; w: number; h: number };

export type FloorPlan = {
  key: FloorKey;
  label: string;
  short: string;
  image: string;
  /** tinggi / lebar gambar asli */
  aspect: number;
  /** area gambar yang ditampilkan (persen), untuk memangkas ruang putih */
  crop: CropBox;
  hotspots: Hotspot[];
};

function kamar(id: string, roomNumber: string, x: number, y: number, w: number, h: number): Hotspot {
  return { id, label: `Kamar ${roomNumber}`, type: "kamar", roomNumber, x, y, w, h };
}

function umum(
  id: string,
  label: string,
  locationMatch: string[],
  x: number,
  y: number,
  w: number,
  h: number,
): Hotspot {
  return { id, label, type: "umum", locationMatch, x, y, w, h };
}

/*
 * Koordinat di bawah diukur langsung dari denah arsitektur asli (skala 1:80).
 * Semua nilai dalam persen terhadap ukuran gambar sumber.
 * Denah lantai: 1024x1024. Rooftop: 1152x928.
 * Urutan nomor kamar: baris atas kiri -> kanan, lalu baris bawah kiri -> kanan.
 */

const lantai1Hotspots: Hotspot[] = [
  // baris atas (grid kolom: 14.5 / 26.1 / 37.7 / 49.4 / 61.0 / 72.6 / 84.6)
  kamar("l1-001", "001", 14.6, 25.5, 11.4, 9.6),
  kamar("l1-002", "002", 26.4, 28.2, 11.2, 12.6),
  kamar("l1-003", "003", 38.0, 28.2, 11.2, 12.6),
  kamar("l1-004", "004", 49.7, 28.2, 11.2, 12.6),
  kamar("l1-005", "005", 72.9, 28.2, 11.4, 12.6),
  // baris bawah
  kamar("l1-006", "006", 14.6, 51.2, 11.4, 14.2),
  kamar("l1-007", "007", 26.4, 48.9, 11.2, 12.4),
  kamar("l1-008", "008", 38.0, 48.9, 11.2, 12.4),
  kamar("l1-009", "009", 49.7, 48.9, 11.2, 12.4),
  kamar("l1-010", "010", 61.3, 48.9, 11.2, 12.4),
  umum("l1-lobby", "Lobby", ["lobby", "depan", "resepsionis"], 72.9, 48.9, 12.4, 15.5),
  umum("l1-selasar", "Selasar Lantai 1", ["selasar", "koridor", "lantai 1"], 26.4, 41.2, 58.0, 7.5),
  umum("l1-dapur", "Dapur / KMD Lantai 1", ["dapur", "kmd", "dapur bersama", "lantai 1"], 14.6, 35.3, 11.4, 15.7),
  umum("l1-tangga", "Tangga Lantai 1", ["tangga", "lantai 1"], 65.5, 26.0, 7.0, 15.0),
];

const lantai2Hotspots: Hotspot[] = [
  // baris atas (grid kolom: 11.8 / 24.4 / 36.9 / 49.5 / 62.1 / 74.6 / 87.2)
  kamar("l2-011", "011", 12.0, 23.0, 12.2, 9.2),
  kamar("l2-012", "012", 24.7, 25.6, 12.0, 13.7),
  kamar("l2-013", "013", 37.2, 25.6, 12.0, 13.7),
  kamar("l2-014", "014", 49.8, 25.6, 12.0, 13.7),
  kamar("l2-015", "015", 74.9, 25.6, 12.1, 13.7),
  // baris bawah
  kamar("l2-016", "016", 12.0, 52.0, 12.2, 13.8),
  kamar("l2-017", "017", 24.7, 48.0, 12.0, 12.8),
  kamar("l2-018", "018", 37.2, 48.0, 12.0, 12.8),
  kamar("l2-019", "019", 49.8, 48.0, 12.0, 12.8),
  kamar("l2-020", "020", 62.4, 48.0, 12.0, 12.8),
  kamar("l2-021", "021", 74.9, 48.0, 12.1, 12.8),
  umum("l2-selasar", "Selasar Lantai 2", ["selasar", "koridor", "lantai 2"], 24.7, 39.7, 56.5, 7.9),
  umum("l2-balkon", "Balkon Lantai 2", ["balkon", "lantai 2"], 81.4, 39.7, 5.8, 7.9),
  umum("l2-dapur", "Dapur / KMD Lantai 2", ["dapur", "kmd", "dapur bersama", "lantai 2"], 12.0, 32.4, 12.2, 19.4),
  umum("l2-tangga", "Tangga Lantai 2", ["tangga", "lantai 2"], 62.4, 23.0, 12.0, 16.3),
];

const lantai3Hotspots: Hotspot[] = [
  // baris atas (grid kolom: 14.2 / 26.3 / 38.4 / 50.4 / 62.5 / 74.7 / 86.8)
  kamar("l3-022", "022", 14.4, 23.8, 11.8, 9.4),
  kamar("l3-023", "023", 26.6, 26.5, 11.6, 13.2),
  kamar("l3-024", "024", 38.6, 26.5, 11.6, 13.2),
  kamar("l3-025", "025", 50.6, 26.5, 11.6, 13.2),
  kamar("l3-026", "026", 75.0, 26.5, 11.6, 13.2),
  // baris bawah
  kamar("l3-027", "027", 14.4, 52.3, 11.8, 13.4),
  kamar("l3-028", "028", 26.6, 48.3, 11.6, 12.6),
  kamar("l3-029", "029", 38.6, 48.3, 11.6, 12.6),
  kamar("l3-030", "030", 50.6, 48.3, 11.6, 12.6),
  kamar("l3-031", "031", 75.0, 48.3, 11.6, 12.6),
  umum("l3-lobby", "Lobby Lantai 3", ["lobby", "lantai 3"], 62.7, 48.3, 11.8, 12.6),
  umum("l3-selasar", "Selasar Lantai 3", ["selasar", "koridor", "lantai 3"], 26.6, 40.1, 54.4, 8.0),
  umum("l3-balkon", "Balkon Lantai 3", ["balkon", "lantai 3"], 81.2, 40.1, 5.6, 8.0),
  umum("l3-dapur", "Dapur / KMD Lantai 3", ["dapur", "kmd", "dapur bersama", "lantai 3"], 14.4, 33.0, 11.8, 19.2),
  umum("l3-tangga", "Tangga Lantai 3", ["tangga", "lantai 3"], 62.7, 23.8, 12.0, 16.0),
];

/** Rooftop memakai gambar 1152x928, jadi persentasenya berbeda. */
const rooftopHotspots: Hotspot[] = [
  umum("rt-dak-1", "Dak Atap Barat", ["dak", "atap", "rooftop"], 18.1, 22.0, 10.5, 19.4),
  umum("rt-atap-1", "Atap Kamar Utara", ["atap", "genteng", "rooftop"], 28.8, 22.0, 32.3, 19.4),
  umum("rt-dak-2", "Dak Atap Tengah", ["dak", "atap", "talang", "rooftop"], 18.1, 42.1, 43.0, 5.6),
  umum("rt-atap-2", "Atap Kamar Selatan", ["atap", "genteng", "rooftop"], 18.1, 48.4, 43.0, 18.8),
  umum("rt-tangga", "Tangga / Turun", ["tangga", "turun", "rooftop"], 62.0, 22.0, 10.4, 19.4),
  umum("rt-rooftop", "Rooftop Tengah", ["rooftop", "santai"], 62.0, 42.1, 10.4, 6.3),
  umum("rt-cuci", "Cuci Jemur", ["cuci", "jemur", "rooftop"], 62.0, 49.0, 10.4, 18.2),
  umum("rt-rooftop-timur", "Rooftop Timur", ["rooftop", "taman", "santai"], 73.0, 22.0, 10.8, 45.2),

];

/** Gambar lantai persegi: denah hanya mengisi bagian tengah. */
const FLOOR_CROP: CropBox = { x: 9.5, y: 20.0, w: 83, h: 48 };
const ROOFTOP_CROP: CropBox = { x: 16, y: 19.5, w: 70, h: 50 };

export const FLOOR_PLANS: FloorPlan[] = [
  { key: "1", label: "Lantai 1", short: "L1", image: lantai1.url, aspect: 1, crop: FLOOR_CROP, hotspots: lantai1Hotspots },
  { key: "2", label: "Lantai 2", short: "L2", image: lantai2.url, aspect: 1, crop: FLOOR_CROP, hotspots: lantai2Hotspots },
  { key: "3", label: "Lantai 3", short: "L3", image: lantai3.url, aspect: 1, crop: FLOOR_CROP, hotspots: lantai3Hotspots },
  {
    key: "rooftop",
    label: "Rooftop",
    short: "RT",
    image: rooftop.url,
    aspect: 928 / 1152,
    crop: ROOFTOP_CROP,
    hotspots: rooftopHotspots,
  },
];


/** Ubah koordinat hotspot (persen gambar) menjadi persen terhadap area crop. */
export function cropRect(crop: CropBox, hotspot: Hotspot) {
  return {
    left: ((hotspot.x - crop.x) / crop.w) * 100,
    top: ((hotspot.y - crop.y) / crop.h) * 100,
    width: (hotspot.w / crop.w) * 100,
    height: (hotspot.h / crop.h) * 100,
  };
}

export function floorPlan(key: FloorKey): FloorPlan {
  return FLOOR_PLANS.find((f) => f.key === key) ?? FLOOR_PLANS[0]!;
}

export function floorKeyForRoom(floor: number): FloorKey {
  return floor === 2 ? "2" : floor === 3 ? "3" : "1";
}

export const MAPPED_ROOM_NUMBERS = new Set(
  FLOOR_PLANS.flatMap((f) => f.hotspots.map((h) => h.roomNumber).filter(Boolean) as string[]),
);

export function matchesLocation(location: string | null, keywords: string[] | undefined) {
  if (!location || !keywords?.length) return false;
  const value = location.toLowerCase();
  return keywords.some((k) => value.includes(k.toLowerCase()));
}
