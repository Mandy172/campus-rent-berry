export const CATEGORIES = [
  { value: "tools", label: "Tools & equipment", examples: "Drills, pressure washers, ladders" },
  { value: "event", label: "Party & event gear", examples: "Tables, coolers, heaters" },
  { value: "outdoor", label: "Outdoor & camping", examples: "Tents, coolers, sports kit" },
  { value: "electronics", label: "Cameras & electronics", examples: "Cameras, drones, speakers" },
  { value: "books", label: "Books & study gear", examples: "Textbooks, calculators, drafters" },
  { value: "other", label: "Everything else", examples: "Costumes, instruments, sports kit" },
] as const;

export const CAMPUS_LOCATIONS = [
  "Main Gate",
  "Central Library Plaza",
  "Engineering Block",
  "School of Design Studio",
  "Boys Hostel, Block A",
  "Girls Hostel, Block B",
  "Food Court",
  "Sports Complex",
  "Auditorium Lobby",
] as const;