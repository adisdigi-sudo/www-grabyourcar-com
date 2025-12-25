export interface Dealer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  whatsapp: string;
  email: string;
  workingHours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  services: string[];
  rating: number;
  reviews: number;
  isAuthorized: boolean;
}

export interface StateWithDealers {
  state: string;
  stateCode: string;
  cities: {
    city: string;
    dealers: Dealer[];
  }[];
}

export const dealerNetwork: StateWithDealers[] = [
  {
    state: "Delhi",
    stateCode: "DL",
    cities: [
      {
        city: "New Delhi",
        dealers: [
          {
            id: "dl-1",
            name: "Grabyourcar Arena - Connaught Place",
            address: "14-A, Outer Circle, Connaught Place",
            city: "New Delhi",
            state: "Delhi",
            pincode: "110001",
            phone: "+91 98765 43210",
            whatsapp: "+91 98765 43210",
            email: "cp@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange"],
            rating: 4.8,
            reviews: 342,
            isAuthorized: true
          },
          {
            id: "dl-2",
            name: "Grabyourcar Nexus - Dwarka",
            address: "Plot 5, Sector 12, Dwarka",
            city: "New Delhi",
            state: "Delhi",
            pincode: "110078",
            phone: "+91 98765 43211",
            whatsapp: "+91 98765 43211",
            email: "dwarka@grabyourcar.in",
            workingHours: {
              weekdays: "9:30 AM - 8:00 PM",
              saturday: "9:30 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Service Center"],
            rating: 4.7,
            reviews: 256,
            isAuthorized: true
          },
          {
            id: "dl-3",
            name: "Grabyourcar Premium - Vasant Kunj",
            address: "Ground Floor, Ambience Mall, Vasant Kunj",
            city: "New Delhi",
            state: "Delhi",
            pincode: "110070",
            phone: "+91 98765 43212",
            whatsapp: "+91 98765 43212",
            email: "vasantkunj@grabyourcar.in",
            workingHours: {
              weekdays: "10:00 AM - 9:00 PM",
              saturday: "10:00 AM - 9:00 PM",
              sunday: "11:00 AM - 8:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Premium Lounge"],
            rating: 4.9,
            reviews: 189,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Noida",
        dealers: [
          {
            id: "noida-1",
            name: "Grabyourcar Hub - Sector 18",
            address: "C-56, Sector 18, Near Atta Market",
            city: "Noida",
            state: "Delhi",
            pincode: "201301",
            phone: "+91 98765 43213",
            whatsapp: "+91 98765 43213",
            email: "noida@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange"],
            rating: 4.6,
            reviews: 298,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Gurugram",
        dealers: [
          {
            id: "ggn-1",
            name: "Grabyourcar Plaza - MG Road",
            address: "Tower A, DLF Cyber Hub, MG Road",
            city: "Gurugram",
            state: "Delhi",
            pincode: "122002",
            phone: "+91 98765 43214",
            whatsapp: "+91 98765 43214",
            email: "gurugram@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 9:00 PM",
              saturday: "9:00 AM - 9:00 PM",
              sunday: "10:00 AM - 7:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Premium Service"],
            rating: 4.8,
            reviews: 412,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "Maharashtra",
    stateCode: "MH",
    cities: [
      {
        city: "Mumbai",
        dealers: [
          {
            id: "mh-1",
            name: "Grabyourcar Flagship - Worli",
            address: "Worli Sea Face Road, Near Nehru Centre",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400018",
            phone: "+91 98765 43220",
            whatsapp: "+91 98765 43220",
            email: "worli@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange", "Premium Lounge"],
            rating: 4.9,
            reviews: 567,
            isAuthorized: true
          },
          {
            id: "mh-2",
            name: "Grabyourcar Arena - Andheri",
            address: "Link Road, Andheri West",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400053",
            phone: "+91 98765 43221",
            whatsapp: "+91 98765 43221",
            email: "andheri@grabyourcar.in",
            workingHours: {
              weekdays: "9:30 AM - 8:30 PM",
              saturday: "9:30 AM - 8:30 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance"],
            rating: 4.7,
            reviews: 345,
            isAuthorized: true
          },
          {
            id: "mh-3",
            name: "Grabyourcar Express - Thane",
            address: "Eastern Express Highway, Thane West",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400601",
            phone: "+91 98765 43222",
            whatsapp: "+91 98765 43222",
            email: "thane@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 5:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Exchange"],
            rating: 4.6,
            reviews: 234,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Pune",
        dealers: [
          {
            id: "pune-1",
            name: "Grabyourcar Central - Koregaon Park",
            address: "Lane 6, Koregaon Park",
            city: "Pune",
            state: "Maharashtra",
            pincode: "411001",
            phone: "+91 98765 43223",
            whatsapp: "+91 98765 43223",
            email: "pune@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange"],
            rating: 4.8,
            reviews: 289,
            isAuthorized: true
          },
          {
            id: "pune-2",
            name: "Grabyourcar Hub - Hinjewadi",
            address: "Phase 1, Hinjewadi IT Park",
            city: "Pune",
            state: "Maharashtra",
            pincode: "411057",
            phone: "+91 98765 43224",
            whatsapp: "+91 98765 43224",
            email: "hinjewadi@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 9:00 PM",
              saturday: "9:00 AM - 9:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Corporate Sales"],
            rating: 4.7,
            reviews: 178,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Nagpur",
        dealers: [
          {
            id: "ngp-1",
            name: "Grabyourcar Prime - Dharampeth",
            address: "Central Avenue, Dharampeth",
            city: "Nagpur",
            state: "Maharashtra",
            pincode: "440010",
            phone: "+91 98765 43225",
            whatsapp: "+91 98765 43225",
            email: "nagpur@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 7:30 PM",
              saturday: "9:00 AM - 7:30 PM",
              sunday: "10:00 AM - 5:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance"],
            rating: 4.5,
            reviews: 156,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "Karnataka",
    stateCode: "KA",
    cities: [
      {
        city: "Bangalore",
        dealers: [
          {
            id: "ka-1",
            name: "Grabyourcar Elite - Indiranagar",
            address: "100 Feet Road, Indiranagar",
            city: "Bangalore",
            state: "Karnataka",
            pincode: "560038",
            phone: "+91 98765 43230",
            whatsapp: "+91 98765 43230",
            email: "indiranagar@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange", "Premium Service"],
            rating: 4.9,
            reviews: 478,
            isAuthorized: true
          },
          {
            id: "ka-2",
            name: "Grabyourcar Hub - Whitefield",
            address: "ITPL Main Road, Whitefield",
            city: "Bangalore",
            state: "Karnataka",
            pincode: "560066",
            phone: "+91 98765 43231",
            whatsapp: "+91 98765 43231",
            email: "whitefield@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 9:00 PM",
              saturday: "9:00 AM - 9:00 PM",
              sunday: "10:00 AM - 7:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Corporate Sales"],
            rating: 4.7,
            reviews: 356,
            isAuthorized: true
          },
          {
            id: "ka-3",
            name: "Grabyourcar Express - Electronic City",
            address: "Phase 1, Electronic City",
            city: "Bangalore",
            state: "Karnataka",
            pincode: "560100",
            phone: "+91 98765 43232",
            whatsapp: "+91 98765 43232",
            email: "ecity@grabyourcar.in",
            workingHours: {
              weekdays: "9:30 AM - 8:30 PM",
              saturday: "9:30 AM - 8:30 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance"],
            rating: 4.6,
            reviews: 234,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Mysore",
        dealers: [
          {
            id: "mys-1",
            name: "Grabyourcar Central - Vijayanagar",
            address: "Hunsur Road, Vijayanagar",
            city: "Mysore",
            state: "Karnataka",
            pincode: "570017",
            phone: "+91 98765 43233",
            whatsapp: "+91 98765 43233",
            email: "mysore@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 7:30 PM",
              saturday: "9:00 AM - 7:30 PM",
              sunday: "10:00 AM - 5:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Exchange"],
            rating: 4.6,
            reviews: 145,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "Tamil Nadu",
    stateCode: "TN",
    cities: [
      {
        city: "Chennai",
        dealers: [
          {
            id: "tn-1",
            name: "Grabyourcar Flagship - Anna Nagar",
            address: "2nd Avenue, Anna Nagar West",
            city: "Chennai",
            state: "Tamil Nadu",
            pincode: "600040",
            phone: "+91 98765 43240",
            whatsapp: "+91 98765 43240",
            email: "annanagar@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange", "Premium Lounge"],
            rating: 4.8,
            reviews: 423,
            isAuthorized: true
          },
          {
            id: "tn-2",
            name: "Grabyourcar Arena - OMR",
            address: "Perungudi, Old Mahabalipuram Road",
            city: "Chennai",
            state: "Tamil Nadu",
            pincode: "600096",
            phone: "+91 98765 43241",
            whatsapp: "+91 98765 43241",
            email: "omr@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 9:00 PM",
              saturday: "9:00 AM - 9:00 PM",
              sunday: "10:00 AM - 7:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Corporate Sales"],
            rating: 4.7,
            reviews: 312,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Coimbatore",
        dealers: [
          {
            id: "cbe-1",
            name: "Grabyourcar Prime - RS Puram",
            address: "DB Road, RS Puram",
            city: "Coimbatore",
            state: "Tamil Nadu",
            pincode: "641002",
            phone: "+91 98765 43242",
            whatsapp: "+91 98765 43242",
            email: "coimbatore@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 7:30 PM",
              saturday: "9:00 AM - 7:30 PM",
              sunday: "10:00 AM - 5:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance"],
            rating: 4.6,
            reviews: 198,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "Gujarat",
    stateCode: "GJ",
    cities: [
      {
        city: "Ahmedabad",
        dealers: [
          {
            id: "gj-1",
            name: "Grabyourcar Elite - SG Highway",
            address: "Corporate Road, SG Highway",
            city: "Ahmedabad",
            state: "Gujarat",
            pincode: "380054",
            phone: "+91 98765 43250",
            whatsapp: "+91 98765 43250",
            email: "sghighway@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange"],
            rating: 4.8,
            reviews: 367,
            isAuthorized: true
          },
          {
            id: "gj-2",
            name: "Grabyourcar Hub - CG Road",
            address: "CG Road, Navrangpura",
            city: "Ahmedabad",
            state: "Gujarat",
            pincode: "380009",
            phone: "+91 98765 43251",
            whatsapp: "+91 98765 43251",
            email: "cgroad@grabyourcar.in",
            workingHours: {
              weekdays: "9:30 AM - 8:00 PM",
              saturday: "9:30 AM - 8:00 PM",
              sunday: "10:00 AM - 5:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance"],
            rating: 4.6,
            reviews: 245,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Surat",
        dealers: [
          {
            id: "srt-1",
            name: "Grabyourcar Central - Adajan",
            address: "VIP Road, Adajan",
            city: "Surat",
            state: "Gujarat",
            pincode: "395009",
            phone: "+91 98765 43252",
            whatsapp: "+91 98765 43252",
            email: "surat@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Exchange"],
            rating: 4.7,
            reviews: 189,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "Rajasthan",
    stateCode: "RJ",
    cities: [
      {
        city: "Jaipur",
        dealers: [
          {
            id: "rj-1",
            name: "Grabyourcar Royal - Vaishali Nagar",
            address: "Main Road, Vaishali Nagar",
            city: "Jaipur",
            state: "Rajasthan",
            pincode: "302021",
            phone: "+91 98765 43260",
            whatsapp: "+91 98765 43260",
            email: "jaipur@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange"],
            rating: 4.7,
            reviews: 276,
            isAuthorized: true
          },
          {
            id: "rj-2",
            name: "Grabyourcar Express - Malviya Nagar",
            address: "JLN Marg, Malviya Nagar",
            city: "Jaipur",
            state: "Rajasthan",
            pincode: "302017",
            phone: "+91 98765 43261",
            whatsapp: "+91 98765 43261",
            email: "malviyanagar@grabyourcar.in",
            workingHours: {
              weekdays: "9:30 AM - 7:30 PM",
              saturday: "9:30 AM - 7:30 PM",
              sunday: "10:00 AM - 5:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance"],
            rating: 4.5,
            reviews: 167,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Udaipur",
        dealers: [
          {
            id: "udp-1",
            name: "Grabyourcar Prime - Fatehpura",
            address: "Airport Road, Fatehpura",
            city: "Udaipur",
            state: "Rajasthan",
            pincode: "313001",
            phone: "+91 98765 43262",
            whatsapp: "+91 98765 43262",
            email: "udaipur@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 7:00 PM",
              saturday: "9:00 AM - 7:00 PM",
              sunday: "10:00 AM - 4:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance"],
            rating: 4.6,
            reviews: 134,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "West Bengal",
    stateCode: "WB",
    cities: [
      {
        city: "Kolkata",
        dealers: [
          {
            id: "wb-1",
            name: "Grabyourcar Elite - Park Street",
            address: "22, Park Street",
            city: "Kolkata",
            state: "West Bengal",
            pincode: "700016",
            phone: "+91 98765 43270",
            whatsapp: "+91 98765 43270",
            email: "parkstreet@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Premium Lounge"],
            rating: 4.8,
            reviews: 389,
            isAuthorized: true
          },
          {
            id: "wb-2",
            name: "Grabyourcar Hub - Salt Lake",
            address: "Sector V, Salt Lake City",
            city: "Kolkata",
            state: "West Bengal",
            pincode: "700091",
            phone: "+91 98765 43271",
            whatsapp: "+91 98765 43271",
            email: "saltlake@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 9:00 PM",
              saturday: "9:00 AM - 9:00 PM",
              sunday: "10:00 AM - 7:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Corporate Sales"],
            rating: 4.7,
            reviews: 267,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "Telangana",
    stateCode: "TS",
    cities: [
      {
        city: "Hyderabad",
        dealers: [
          {
            id: "ts-1",
            name: "Grabyourcar Flagship - Banjara Hills",
            address: "Road No. 12, Banjara Hills",
            city: "Hyderabad",
            state: "Telangana",
            pincode: "500034",
            phone: "+91 98765 43280",
            whatsapp: "+91 98765 43280",
            email: "banjarahills@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange", "Premium Lounge"],
            rating: 4.9,
            reviews: 456,
            isAuthorized: true
          },
          {
            id: "ts-2",
            name: "Grabyourcar Arena - Gachibowli",
            address: "Financial District, Gachibowli",
            city: "Hyderabad",
            state: "Telangana",
            pincode: "500032",
            phone: "+91 98765 43281",
            whatsapp: "+91 98765 43281",
            email: "gachibowli@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 9:00 PM",
              saturday: "9:00 AM - 9:00 PM",
              sunday: "10:00 AM - 7:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Corporate Sales"],
            rating: 4.8,
            reviews: 378,
            isAuthorized: true
          },
          {
            id: "ts-3",
            name: "Grabyourcar Express - Kukatpally",
            address: "KPHB Colony, Kukatpally",
            city: "Hyderabad",
            state: "Telangana",
            pincode: "500072",
            phone: "+91 98765 43282",
            whatsapp: "+91 98765 43282",
            email: "kukatpally@grabyourcar.in",
            workingHours: {
              weekdays: "9:30 AM - 8:30 PM",
              saturday: "9:30 AM - 8:30 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance"],
            rating: 4.6,
            reviews: 234,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "Kerala",
    stateCode: "KL",
    cities: [
      {
        city: "Kochi",
        dealers: [
          {
            id: "kl-1",
            name: "Grabyourcar Elite - MG Road",
            address: "MG Road, Ernakulam",
            city: "Kochi",
            state: "Kerala",
            pincode: "682011",
            phone: "+91 98765 43290",
            whatsapp: "+91 98765 43290",
            email: "kochi@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 7:30 PM",
              saturday: "9:00 AM - 7:30 PM",
              sunday: "10:00 AM - 5:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange"],
            rating: 4.7,
            reviews: 267,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Thiruvananthapuram",
        dealers: [
          {
            id: "tvm-1",
            name: "Grabyourcar Central - Kowdiar",
            address: "Kowdiar Junction",
            city: "Thiruvananthapuram",
            state: "Kerala",
            pincode: "695003",
            phone: "+91 98765 43291",
            whatsapp: "+91 98765 43291",
            email: "trivandrum@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 7:00 PM",
              saturday: "9:00 AM - 7:00 PM",
              sunday: "10:00 AM - 4:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance"],
            rating: 4.6,
            reviews: 178,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "Uttar Pradesh",
    stateCode: "UP",
    cities: [
      {
        city: "Lucknow",
        dealers: [
          {
            id: "up-1",
            name: "Grabyourcar Prime - Gomti Nagar",
            address: "Vibhuti Khand, Gomti Nagar",
            city: "Lucknow",
            state: "Uttar Pradesh",
            pincode: "226010",
            phone: "+91 98765 43300",
            whatsapp: "+91 98765 43300",
            email: "lucknow@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange"],
            rating: 4.7,
            reviews: 234,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Kanpur",
        dealers: [
          {
            id: "knp-1",
            name: "Grabyourcar Hub - Mall Road",
            address: "Mall Road, Civil Lines",
            city: "Kanpur",
            state: "Uttar Pradesh",
            pincode: "208001",
            phone: "+91 98765 43301",
            whatsapp: "+91 98765 43301",
            email: "kanpur@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 7:30 PM",
              saturday: "9:00 AM - 7:30 PM",
              sunday: "10:00 AM - 5:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance"],
            rating: 4.5,
            reviews: 156,
            isAuthorized: true
          }
        ]
      }
    ]
  },
  {
    state: "Punjab",
    stateCode: "PB",
    cities: [
      {
        city: "Chandigarh",
        dealers: [
          {
            id: "pb-1",
            name: "Grabyourcar Elite - Sector 17",
            address: "SCO 45-46, Sector 17",
            city: "Chandigarh",
            state: "Punjab",
            pincode: "160017",
            phone: "+91 98765 43310",
            whatsapp: "+91 98765 43310",
            email: "chandigarh@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 8:00 PM",
              saturday: "9:00 AM - 8:00 PM",
              sunday: "10:00 AM - 6:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Insurance", "Exchange"],
            rating: 4.8,
            reviews: 298,
            isAuthorized: true
          }
        ]
      },
      {
        city: "Ludhiana",
        dealers: [
          {
            id: "ldh-1",
            name: "Grabyourcar Central - Ferozepur Road",
            address: "Ferozepur Road, Model Town",
            city: "Ludhiana",
            state: "Punjab",
            pincode: "141002",
            phone: "+91 98765 43311",
            whatsapp: "+91 98765 43311",
            email: "ludhiana@grabyourcar.in",
            workingHours: {
              weekdays: "9:00 AM - 7:30 PM",
              saturday: "9:00 AM - 7:30 PM",
              sunday: "10:00 AM - 5:00 PM"
            },
            services: ["New Car Sales", "Test Drive", "Finance", "Exchange"],
            rating: 4.6,
            reviews: 178,
            isAuthorized: true
          }
        ]
      }
    ]
  }
];

export const getAllStates = (): string[] => {
  return dealerNetwork.map(s => s.state);
};

export const getCitiesByState = (state: string): string[] => {
  const stateData = dealerNetwork.find(s => s.state === state);
  return stateData ? stateData.cities.map(c => c.city) : [];
};

export const getDealersByCity = (state: string, city: string): Dealer[] => {
  const stateData = dealerNetwork.find(s => s.state === state);
  if (!stateData) return [];
  const cityData = stateData.cities.find(c => c.city === city);
  return cityData ? cityData.dealers : [];
};

export const getAllDealers = (): Dealer[] => {
  return dealerNetwork.flatMap(state => 
    state.cities.flatMap(city => city.dealers)
  );
};
