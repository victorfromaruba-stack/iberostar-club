// Content catalog. gallery[0] is the card/hero image; every gallery entry is a real file on disk
// (verified against the asset folders — do not add paths here without confirming the file exists).
const defaultData = {
    "Joia": {
        "type": "club",
        "title": "Iberostar Joia",
        "sub": "Eagle Beach",
        "desc": "Experience the crown jewel of Aruba. Located on the pristine shores of Eagle Beach, Joia is an adults-only haven offering butler service, swim-up suites, and a level of exclusivity that redefines Caribbean luxury.",
        "gallery": [
            "Hotels/Joia/hotel_joia_1.jpg",
            "Hotels/Joia/hotel_joia_2.jpg",
            "Hotels/Joia/hotel_joia_3.jpg",
            "Hotels/Joia/hotel_joia_4.jpg",
            "Hotels/Joia/hotel_joia_5.jpg",
            "Hotels/Joia/hotel_joia_6.jpg",
            "Hotels/Joia/hotel_joia_7.jpg",
            "Hotels/Joia/hotel_joia_8.jpg",
            "Hotels/Joia/hotel_joia_9.jpg",
            "Hotels/Joia/hotel_joia_10.jpg",
            "Hotels/Joia/hotel_joia_11.jpg",
            "Hotels/Joia/hotel_joia_12.jpg"
        ]
    },
    "Tierra": {
        "type": "club",
        "title": "Tierra del Sol",
        "sub": "Golf & Estates",
        "desc": "Escape to the island's most prestigious gated community. Featuring luxury villas, a championship golf course, and panoramic views of the California Lighthouse and rugged North Coast.",
        "gallery": [
            "Hotels/Tierra/golf_tierra_1.jpg",
            "Hotels/Tierra/golf_tierra_2.jpg",
            "Hotels/Tierra/golf_tierra_3.jpg",
            "Hotels/Tierra/golf_tierra_4.jpg",
            "Hotels/Tierra/golf_tierra_5.jpg"
        ],
        "video": "Hotels/Tierra/golf_tierra.mp4"
    },
    "Selection": {
        "type": "club",
        "title": "Iberostar Selection",
        "sub": "Coming Soon",
        "desc": "Bringing the premium Selection family experience to the Caribbean. Designed for families who refuse to compromise on luxury.",
        "gallery": [
            "Hotels/Selection/hotel_selection_1.png"
        ],
        "video": ""
    },
    "Joia2": {
        "type": "club",
        "title": "Iberostar Joia (Lighthouse)",
        "sub": "In Development",
        "desc": "The next chapter of the Joia collection is currently in development. This exclusive property will feature unparalleled luxury and direct access to the island's most secluded beaches.",
        "gallery": [
            "Hotels/Joia2/hotel_joia2_1.jpg"
        ],
        "video": ""
    },
    "TierraGolf": {
        "type": "golf",
        "title": "Tierra del Sol",
        "sub": "Championship Golf",
        "desc": "Play a round at Tierra del Sol, Aruba's premier 18-hole championship golf course designed by Robert Trent Jones II. Experience challenging play with sweeping ocean views on every hole.",
        "gallery": [
            "Golf/Course/golf_1.jpg"
        ],
        "video": "Hotels/Tierra/golf_tierra.mp4",
        "duration": "4 Hours",
        "time": "Tee Times: 7am - 2pm",
        "essentials": [
            "Golf Shoes",
            "Collared Shirt",
            "Sunscreen"
        ]
    },
    "BirdLife": {
        "type": "golf",
        "title": "Audubon Sanctuary",
        "sub": "Nature & Wildlife",
        "desc": "Iberostar is committed to sustainability. Our golf course is a certified Audubon Cooperative Sanctuary, providing a protected habitat for the endemic Shoco (Burrowing Owl).",
        "gallery": [
            "Golf/Birds/birds_1.jpg",
            "Golf/Birds/birds_3.jpg",
            "Golf/Birds/birds_4.jpg",
            "Golf/Birds/birds_5.jpg"
        ],
        "pdf": ""
    },
    "ArubaAloe": {
        "type": "store",
        "title": "Aruba Aloe",
        "sub": "Local Skincare & Gifts",
        "desc": "Discover the healing power of Aruban Aloe. Founded in 1890, Aruba Aloe is one of the oldest aloe companies in the world, offering premium sun care, lotions, and locally made gifts perfect for bringing a piece of Aruba home.",
        "gallery": [],
        "pdf": ""
    },
    "RedSailSail": {
        "type": "fun",
        "title": "Luxury Catamaran Sail",
        "sub": "Red Sail Sports Aruba",
        "desc": "Experience the beautiful Caribbean waters aboard a luxury catamaran. Includes premium snorkeling stops at the famous Antilla shipwreck and vibrant coral reefs, complete with an open bar and snacks. <div class=\"price-box\"><div class=\"price-row\"><span>Adult Ticket</span><strong>$107.00</strong></div><div class=\"price-row\"><span>Child Ticket</span><strong>$65.00</strong></div></div>",
        "gallery": [],
        "duration": "4 Hours",
        "time": "Morning & Afternoon Departures"
    },
    "RedSailSunset": {
        "type": "fun",
        "title": "Sunset Cruise",
        "sub": "Red Sail Sports Aruba",
        "desc": "Enjoy a romantic and relaxing sunset sail along the stunning Aruban coastline. Sip on premium cocktails and enjoy hors d'oeuvres while watching the sun dip below the horizon. <div class=\"price-box\"><div class=\"price-row\"><span>Adult Ticket</span><strong>$69.00</strong></div><div class=\"price-row\"><span>Child Ticket</span><strong>$45.00</strong></div></div>",
        "gallery": [],
        "duration": "2 Hours",
        "time": "5:30 PM"
    },
    "UTV": {
        "type": "fun",
        "title": "UTV & ATV Adventure Tours",
        "sub": "Rocka Beach Tours",
        "desc": "Guided off-road safari. Explore the wild side of Aruba. <div class=\"price-box\"><div class=\"price-row\"><span>ATV Single</span><strong>$160.00</strong></div><div class=\"price-row\"><span>UTV 2-Seater</span><strong>$230.00</strong></div><div class=\"price-row\"><span>UTV 3-Seater</span><strong>$305.00</strong></div><div class=\"price-row\"><span>UTV 4-Seater</span><strong>$380.00</strong></div></div>",
        "gallery": [
            "Activites/Rockabeach/act_utv_1.jpg"
        ],
        "partnerLogo": "Logos/logo_rocka.png",
        "duration": "4 Hours",
        "time": "Morning: 9:30 AM | Afternoon: 2:30 PM",
        "itinerary": [
            "Black Stone Beach",
            "3 Bridges",
            "Baby Bridge",
            "Bushiribana Gold Ruins",
            "Wariruri Beach",
            "California Lighthouse",
            "Secret Beach"
        ],
        "essentials": [
            "Valid Drivers License",
            "Sunblock",
            "Sunglasses",
            "Bandana",
            "Old clothes"
        ]
    },
    "Jeep": {
        "type": "fun",
        "title": "Jeep Safari Adventure",
        "sub": "Rocka Beach Tours",
        "desc": "Explore Arikok National Park in open-air Land Rovers. Visit breathtaking caves and natural pools. <div class=\"price-box\"><div class=\"price-row\"><span>Adult (Tour A)</span><strong>$97.00</strong></div><div class=\"price-row\"><span>Child (Tour A)</span><strong>$75.00</strong></div></div>",
        "gallery": [
            "Activites/Rockabeach/act_jeep_1.jpg"
        ],
        "partnerLogo": "Logos/logo_rocka.png",
        "duration": "4-6 Hours",
        "time": "Pickups start 8:15 AM",
        "itinerary": [
            "Natural Pool",
            "Fontein Cave",
            "Boca Prins",
            "3 Bridges",
            "Natural Bridge",
            "Baby Beach (Tour A)"
        ],
        "essentials": [
            "Swimwear",
            "Towel",
            "Sunscreen",
            "Camera"
        ]
    },
    "GoKart": {
        "type": "fun",
        "title": "Bushiri Karting Speedway",
        "sub": "Rocka Beach Tours",
        "desc": "Outdoor karting experience including 3 races (Practice, Lap Position, Final Race). <div class=\"price-box\"><div class=\"price-row\"><span>Race Experience (Adult)</span><strong>$85.00</strong></div><div class=\"price-row\"><span>Race Experience (Child)</span><strong>$60.00</strong></div><div class=\"price-row\"><span>Arrive & Drive</span><strong>$25.00</strong></div></div>",
        "gallery": [
            "Activites/Rockabeach/act_gokart_1.jpg"
        ],
        "partnerLogo": "Logos/logo_rocka.png",
        "duration": "2 Hours",
        "time": "3:30 PM - 5:30 PM",
        "essentials": [
            "Closed Toe Shoes Required"
        ]
    },
    "Rentals": {
        "type": "fun",
        "title": "UTV & ATV Rentals",
        "sub": "Rocka Beach Tours",
        "desc": "Freedom to explore at your own pace. Security Deposit: $500 required. <div class=\"price-box\"><div class=\"price-row\"><span>UTV 2-Seater (4 hr)</span><strong>$230.00</strong></div><div class=\"price-row\"><span>UTV 2-Seater (8 hr)</span><strong>$275.00</strong></div><div class=\"price-row\"><span>UTV 4-Seater (8 hr)</span><strong>$395.00</strong></div></div>",
        "gallery": [
            "Activites/Rockabeach/act_rentals_1.jpg"
        ],
        "partnerLogo": "Logos/logo_rocka.png",
        "duration": "4 or 8 Hours",
        "essentials": [
            "Valid Drivers License (18+)"
        ]
    },
    "HalfIsland": {
        "type": "fun",
        "title": "Beach Bus Adventure",
        "sub": "Rocka Beach Tours",
        "desc": "Fun 4-hour tour visiting key landmarks and beaches across the island. <div class=\"price-box\"><div class=\"price-row\"><span>Adult</span><strong>$65.00</strong></div><div class=\"price-row\"><span>Child (4-12)</span><strong>$42.00</strong></div></div>",
        "gallery": [
            "Activites/Rockabeach/act_half_1.jpg"
        ],
        "partnerLogo": "Logos/logo_rocka.png",
        "duration": "4 Hours",
        "time": "10:00 AM - 2:00 PM",
        "itinerary": [
            "California Lighthouse",
            "Alto Vista Chapel",
            "Casibari Rock Formation",
            "Natural Bridge",
            "Arashi Beach"
        ]
    },
    "SpaPromo": {
        "type": "spa",
        "title": "Swedish Massage (50min)",
        "sub": "Complimentary Voucher",
        "desc": "Relax and unwind with our signature 50-minute Swedish massage. Designed to relieve tension and improve circulation, this complimentary treatment is the perfect way to start your vacation.",
        "gallery": [
            "Spa/Promo/massage_1.jpg",
            "Spa/Promo/massage_2.jpg",
            "Spa/Promo/massage_3.jpg",
            "Spa/Promo/massage_4.jpg",
            "Spa/Promo/massage_5.jpg",
            "Spa/Promo/massage_6.jpg",
            "Spa/Promo/massage_7.jpg",
            "Spa/Promo/massage_8.jpg"
        ],
        "pdf": "",
        "duration": "50 Minutes",
        "essentials": [
            "Arrive 15min early"
        ]
    },
    "SpaMain": {
        "type": "spa",
        "title": "Spa Sensations",
        "sub": "Joia Aruba • Wellness",
        "desc": "A sanctuary of relaxation featuring a hydrotherapy circuit. Indulge in a wide array of treatments, from volcanic stone massages to aloe vera wraps, all designed to rejuvenate your body and mind.",
        "gallery": [
            "Spa/General/spa_1.jpg",
            "Spa/General/spa_2.jpg",
            "Spa/General/spa_3.jpg",
            "Spa/General/spa_4.jpg",
            "Spa/General/spa_5.jpg",
            "Spa/General/spa_6.jpg",
            "Spa/General/spa_7.jpg",
            "Spa/General/spa_8.jpg",
            "Spa/General/spa_9.jpg",
            "Spa/General/spa_10.jpg",
            "Spa/General/spa_11.jpg"
        ]
    },
    "Giannis": {
        "type": "food",
        "title": "Gianni's Ristorante",
        "sub": "Italian",
        "desc": "Famous for the Spaghetti al Formaggio Parmigiano. Watch as your pasta is prepared tableside in a giant wheel of cheese, a true Italian classic.",
        "gallery": [
            "Restaurants/Gianni's Ristorante/rest_giannis_1.jpg",
            "Restaurants/Gianni's Ristorante/rest_giannis_2.jpg",
            "Restaurants/Gianni's Ristorante/rest_giannis_3.jpg",
            "Restaurants/Gianni's Ristorante/rest_giannis_4.jpg",
            "Restaurants/Gianni's Ristorante/rest_giannis_5.jpg"
        ],
        "pdf": "Restaurants/Gianni's Ristorante/menu_giannis.pdf"
    },
    "Daniels": {
        "type": "food",
        "title": "Daniel's Steak & Chop",
        "sub": "Steakhouse",
        "desc": "Premium Certified Angus Beef and wood-fired chops. A classic steakhouse experience with a rustic touch, perfect for meat lovers seeking quality cuts.",
        "gallery": [
            "Restaurants/Daniel's Steak & Chop/rest_daniels_1.jpg",
            "Restaurants/Daniel's Steak & Chop/rest_daniels_2.jpg",
            "Restaurants/Daniel's Steak & Chop/rest_daniels_3.jpg",
            "Restaurants/Daniel's Steak & Chop/rest_daniels_4.jpg",
            "Restaurants/Daniel's Steak & Chop/rest_daniels_5.jpg"
        ],
        "pdf": "Restaurants/Daniel's Steak & Chop/menu_daniels.pdf"
    },
    "Gaya": {
        "type": "food",
        "title": "Gaya Restaurant",
        "sub": "Joia Aruba • Fine Dining",
        "desc": "An immersive culinary journey featuring world-class gastronomy. Gaya offers an elegant atmosphere paired with innovative flavors designed to delight the senses and elevate your dining experience.",
        "gallery": []
    },
    "Azia": {
        "type": "food",
        "title": "Azia Restaurant",
        "sub": "Asian Fusion",
        "desc": "A journey through Asia with Tapas and modern atmosphere. Exquisite sushi, dim sum, and Asian-fusion dishes in a stylish, Zen-inspired environment.",
        "gallery": [
            "Restaurants/Azia Restaurant/rest_azia_1.jpg",
            "Restaurants/Azia Restaurant/rest_azia_2.jpg",
            "Restaurants/Azia Restaurant/rest_azia_3.jpg",
            "Restaurants/Azia Restaurant/rest_azia_4.jpg",
            "Restaurants/Azia Restaurant/rest_azia_5.jpg"
        ],
        "pdf": "Restaurants/Azia Restaurant/menu_azia.pdf"
    },
    "Azzurro": {
        "type": "food",
        "title": "Azzurro Ristorante",
        "sub": "Seafood",
        "desc": "Located right on the beach, serving authentic Italian seafood. Enjoy panoramic ocean views and fresh catches prepared with traditional Italian flair.",
        "gallery": [
            "Restaurants/Azzurro Ristorante/rest_azzurro_1.jpg",
            "Restaurants/Azzurro Ristorante/rest_azzurro_2.jpg",
            "Restaurants/Azzurro Ristorante/rest_azzurro_3.jpg",
            "Restaurants/Azzurro Ristorante/rest_azzurro_4.jpg",
            "Restaurants/Azzurro Ristorante/rest_azzurro_5.jpg"
        ],
        "pdf": "Restaurants/Azzurro Ristorante/menu_azzurro.pdf"
    },
    "AmoreMio": {
        "type": "food",
        "title": "Amore Mio",
        "sub": "Pizzeria",
        "desc": "Authentic Neapolitan pizza with a crispy, airy crust. A cozy pizzeria offering a variety of traditional toppings and Italian comfort food.",
        "gallery": [
            "Restaurants/Amore Mio/rest_amoremio_1.jpg",
            "Restaurants/Amore Mio/rest_amoremio_2.jpg",
            "Restaurants/Amore Mio/rest_amoremio_3.jpg",
            "Restaurants/Amore Mio/rest_amoremio_4.jpg",
            "Restaurants/Amore Mio/rest_amoremio_5.jpg"
        ],
        "pdf": "Restaurants/Amore Mio/menu_amoremio.pdf"
    },
    "Dushi": {
        "type": "food",
        "title": "Dushi Bagels",
        "sub": "Casual",
        "desc": "The go-to spot for New York style bagels and hearty burgers. A casual, friendly eatery perfect for breakfast or a quick, delicious lunch.",
        "gallery": [
            "Restaurants/Dushi Bagels & Burgers/rest_dushi_1.jpg",
            "Restaurants/Dushi Bagels & Burgers/rest_dushi_2.jpg",
            "Restaurants/Dushi Bagels & Burgers/rest_dushi_3.jpg",
            "Restaurants/Dushi Bagels & Burgers/rest_dushi_4.jpg",
            "Restaurants/Dushi Bagels & Burgers/rest_dushi_5.jpg"
        ],
        "pdf": "Restaurants/Dushi Bagels & Burgers/menu_dushi.pdf"
    },
    "Zima": {
        "type": "food",
        "title": "Zima Rooftop Bar",
        "sub": "Joia Aruba • Rooftop",
        "desc": "Perched atop the Joia hotel, Zima Bar offers the best sunset views. Enjoy handcrafted cocktails and a sophisticated atmosphere while watching the sun dip below the horizon.",
        "gallery": [
            "Restaurants/Zima/rest_zima_1.jpg",
            "Restaurants/Zima/rest_zima_2.jpg",
            "Restaurants/Zima/rest_zima_3.jpg",
            "Restaurants/Zima/rest_zima_4.jpg",
            "Restaurants/Zima/rest_zima_5.jpg",
            "Restaurants/Zima/rest_zima_6.jpg",
            "Restaurants/Zima/rest_zima_7.jpg",
            "Restaurants/Zima/rest_zima_9.jpg",
            "Restaurants/Zima/rest_zima_10.jpg",
            "Restaurants/Zima/rest_zima_11.jpg",
            "Restaurants/Zima/rest_zima_12.jpg",
            "Restaurants/Zima/rest_zima_13.jpg"
        ]
    },
    "Bucatini": {
        "type": "food",
        "title": "Bucatini",
        "sub": "Joia Aruba • Italian",
        "desc": "Modern Italian cuisine featuring a curated Antipasto station. Indulge in fresh pasta, artisanal pizzas, and a wide selection of fine wines in an elegant setting.",
        "gallery": [
            "Restaurants/Bucatini/rest_bucatini_1.jpg",
            "Restaurants/Bucatini/rest_bucatini_2.jpg",
            "Restaurants/Bucatini/rest_bucatini_3.jpg",
            "Restaurants/Bucatini/rest_bucatini_4.jpg",
            "Restaurants/Bucatini/rest_bucatini_5.jpg",
            "Restaurants/Bucatini/rest_bucatini_6.jpg",
            "Restaurants/Bucatini/rest_bucatini_7.jpg",
            "Restaurants/Bucatini/rest_bucatini_8.jpg",
            "Restaurants/Bucatini/rest_bucatini_9.jpg",
            "Restaurants/Bucatini/rest_bucatini_10.jpg",
            "Restaurants/Bucatini/rest_bucatini_11.jpg",
            "Restaurants/Bucatini/rest_bucatini_12.jpg",
            "Restaurants/Bucatini/rest_bucatini_13.jpg",
            "Restaurants/Bucatini/rest_bucatini_14.jpg"
        ]
    },
    "Marea": {
        "type": "food",
        "title": "Marea",
        "sub": "Joia Aruba • Caribbean",
        "desc": "Vibrant Caribbean flavors right on the oceanfront. Savor fresh seafood and local specialties while listening to the soothing sounds of the waves.",
        "gallery": [
            "Restaurants/Marea/rest_marea_1.jpg",
            "Restaurants/Marea/rest_marea_2.jpg",
            "Restaurants/Marea/rest_marea_3.jpg",
            "Restaurants/Marea/rest_marea_4.jpg",
            "Restaurants/Marea/rest_marea_5.jpg",
            "Restaurants/Marea/rest_marea_6.jpg",
            "Restaurants/Marea/rest_marea_7.jpg",
            "Restaurants/Marea/rest_marea_8.jpg",
            "Restaurants/Marea/rest_marea_9.jpg",
            "Restaurants/Marea/rest_marea_10.jpg",
            "Restaurants/Marea/rest_marea_11.jpg",
            "Restaurants/Marea/rest_marea_12.jpg",
            "Restaurants/Marea/rest_marea_13.jpeg"
        ]
    },
    "Birdie": {
        "type": "food",
        "title": "The Birdie",
        "sub": "Tierra del Sol",
        "desc": "Experience the \"Tapas Affair\" with breathtaking views. Located at Tierra del Sol, this spot offers a unique blend of small plates and scenic golf course vistas.",
        "gallery": [
            "Restaurants/Birdie/rest_birdie_1.jpg",
            "Restaurants/Birdie/rest_birdie_2.jpg",
            "Restaurants/Birdie/rest_birdie_3.jpg",
            "Restaurants/Birdie/rest_birdie_4.jpg",
            "Restaurants/Birdie/rest_birdie_5.jpg",
            "Restaurants/Birdie/rest_birdie_6.jpg",
            "Restaurants/Birdie/rest_birdie_7.jpg"
        ]
    },
    "Screaming": {
        "type": "food",
        "title": "Screaming Eagle",
        "sub": "French Fusion",
        "desc": "Inspired by French-fusion cuisine, known for its \"Dinner in Bed\" experience. A chic and trendy spot offering innovative dishes and a romantic ambiance.",
        "gallery": [
            "Restaurants/Screaming Eagle/rest_screaming_1.jpg",
            "Restaurants/Screaming Eagle/rest_screaming_2.jpg",
            "Restaurants/Screaming Eagle/rest_screaming_3.jpg",
            "Restaurants/Screaming Eagle/rest_screaming_4.jpg",
            "Restaurants/Screaming Eagle/rest_screaming_5.jpg"
        ],
        "pdf": "Restaurants/Screaming Eagle/menu_screaming.pdf"
    }
};
