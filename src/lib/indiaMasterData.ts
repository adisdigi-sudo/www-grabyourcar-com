// India master data — states, cities, common car colors, variants
// Used as fallback / supplement to DB data so dropdowns are never empty.

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories
  "Andaman & Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// Top cities per state (covers ~95% of dealer locations)
export const INDIAN_CITIES_BY_STATE: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kurnool", "Rajahmundry", "Kakinada", "Anantapur", "Kadapa"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Bihar Sharif", "Arrah", "Begusarai", "Katihar"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Jagdalpur", "Raigarh"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Bharuch", "Mehsana", "Morbi", "Nadiad", "Navsari", "Surendranagar", "Vapi"],
  "Haryana": ["Gurgaon", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Bhiwani", "Sirsa", "Bahadurgarh", "Jind", "Thanesar", "Kaithal", "Rewari", "Palwal", "Manesar"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Dharamshala", "Kullu", "Manali", "Hamirpur", "Una", "Bilaspur", "Chamba", "Kangra"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh", "Phusro"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga", "Davanagere", "Bellary", "Bijapur", "Shimoga", "Tumkur", "Raichur", "Hassan", "Udupi", "Mandya", "Chitradurga"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad", "Kottayam", "Malappuram", "Pathanamthitta", "Idukki", "Ernakulam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Murwara", "Singrauli", "Burhanpur", "Khandwa", "Bhind", "Chhindwara"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Amravati", "Kolhapur", "Sangli", "Nanded", "Jalgaon", "Akola", "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Parbhani", "Ichalkaranji", "Jalna", "Bhusawal", "Panvel", "Satara", "Beed", "Yavatmal", "Wardha", "Navi Mumbai"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Senapati"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongstoin", "Williamnagar"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Pathankot", "Moga", "Abohar", "Malerkotla", "Khanna", "Phagwara", "Kapurthala", "Firozpur", "Sangrur", "Barnala", "Rajpura"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Alwar", "Bhilwara", "Sikar", "Pali", "Sri Ganganagar", "Tonk", "Kishangarh", "Beawar", "Hanumangarh", "Banswara", "Bharatpur", "Chittorgarh"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Singtam"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Vellore", "Erode", "Thoothukudi", "Dindigul", "Thanjavur", "Hosur", "Nagercoil", "Kanchipuram", "Kumbakonam", "Karur", "Cuddalore", "Tiruvannamalai"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet", "Miryalaguda"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar", "Belonia"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Allahabad", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida", "Greater Noida", "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Rampur", "Shahjahanpur", "Farrukhabad", "Mau", "Hapur", "Etawah", "Mirzapur", "Bulandshahr", "Sambhal", "Amroha", "Hardoi", "Fatehpur", "Raebareli", "Orai", "Sitapur", "Bahraich", "Modinagar", "Unnao", "Jaunpur", "Lakhimpur", "Banda", "Pilibhit"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Nainital", "Mussoorie"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Maheshtala", "Rajpur Sonarpur", "South Dumdum", "Bardhaman", "Malda", "Baharampur", "Habra", "Kharagpur", "Shantipur", "Dankuni", "Dhulian", "Ranaghat", "Haldia", "Raiganj", "Krishnanagar", "Nabadwip", "Medinipur", "Jalpaiguri", "Balurghat", "Basirhat", "Bankura", "Chakdaha", "Darjeeling", "Alipurduar", "Purulia", "Jangipur", "Bolpur", "Bangaon", "Cooch Behar"],
  "Andaman & Nicobar Islands": ["Port Blair", "Diglipur", "Mayabunder", "Rangat"],
  "Chandigarh": ["Chandigarh"],
  "Dadra & Nagar Haveli and Daman & Diu": ["Daman", "Diu", "Silvassa"],
  "Delhi": ["New Delhi", "Delhi", "Dwarka", "Rohini", "Saket", "Karol Bagh", "Connaught Place", "Pitampura", "Janakpuri", "Lajpat Nagar", "Vasant Kunj", "Nehru Place"],
  "Jammu & Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Sopore", "Kathua", "Udhampur", "Punch", "Kupwara"],
  "Ladakh": ["Leh", "Kargil", "Diskit", "Nubra"],
  "Lakshadweep": ["Kavaratti", "Agatti", "Minicoy", "Andrott"],
  "Puducherry": ["Puducherry", "Karaikal", "Yanam", "Mahe"],
};

export const ALL_INDIAN_CITIES: string[] = Array.from(
  new Set(Object.values(INDIAN_CITIES_BY_STATE).flat())
).sort();

// Common Indian car body types
export const CAR_BODY_TYPES = [
  "Hatchback", "Sedan", "SUV", "Compact SUV", "MUV", "MPV",
  "Crossover", "Coupe", "Convertible", "Pickup", "Van", "Luxury",
];

// Common car colors (Indian market)
export const CAR_COLORS = [
  "White", "Pearl White", "Arctic White", "Silver", "Metallic Silver",
  "Grey", "Magnetic Grey", "Granite Grey", "Lunar Grey",
  "Black", "Pearl Black", "Phantom Black", "Midnight Black",
  "Red", "Flame Red", "Passion Red", "Wine Red",
  "Blue", "Royal Blue", "Ocean Blue", "Pearl Blue", "Stealth Blue",
  "Brown", "Bronze", "Cappuccino Brown",
  "Green", "British Green", "Forest Green",
  "Yellow", "Golden", "Champagne Gold",
  "Orange", "Sunset Orange",
  "Beige", "Cream",
  "Two-Tone (White + Black Roof)", "Two-Tone (Red + Black Roof)",
];

// Common variant suffixes used across Indian car brands
export const COMMON_VARIANTS = [
  "Base", "Standard", "LXi", "VXi", "ZXi", "ZXi+", "AMT",
  "S", "SX", "SX(O)", "Asta", "Asta(O)", "Sportz", "Magna", "Era",
  "E", "EX", "V", "VX", "ZX", "ZX+", "G", "GLX", "GX",
  "Petrol Manual", "Petrol Automatic", "Diesel Manual", "Diesel Automatic",
  "CNG", "Hybrid", "Electric", "Turbo", "Turbo DCT",
  "Smart", "Smart+", "Pure", "Pure+", "Style", "Style+", "Tech", "Tech+",
  "Anniversary Edition", "Black Edition", "Sport", "Sport+", "Limited Edition",
];
