// Content catalog. gallery[0] is the card/hero image; every gallery entry is a real file on disk
// (verified against the asset folders — do not add paths here without confirming the file exists).
const defaultData = {
    "Joia": {
        "type": "club",
        "title": "Iberostar Joia",
        "sub": "Eagle Beach",
        "desc": "Experience the crown jewel of Aruba. Located on the pristine shores of Eagle Beach, Joia is an adults-only haven offering butler service, swim-up suites, and a level of exclusivity that redefines Caribbean luxury.",
        "gallery": [
            "assets/Hotels/Joia/hotel_joia_1.jpg",
            "assets/Hotels/Joia/hotel_joia_2.jpg",
            "assets/Hotels/Joia/hotel_joia_3.jpg",
            "assets/Hotels/Joia/hotel_joia_4.jpg",
            "assets/Hotels/Joia/hotel_joia_5.jpg",
            "assets/Hotels/Joia/hotel_joia_6.jpg",
            "assets/Hotels/Joia/hotel_joia_7.jpg",
            "assets/Hotels/Joia/hotel_joia_8.jpg",
            "assets/Hotels/Joia/hotel_joia_9.jpg",
            "assets/Hotels/Joia/hotel_joia_10.jpg",
            "assets/Hotels/Joia/hotel_joia_11.jpg",
            "assets/Hotels/Joia/hotel_joia_12.jpg"
        ]
    },
    "Tierra": {
        "type": "club",
        "title": "Tierra del Sol",
        "sub": "Golf & Estates",
        "desc": "Escape to the island's most prestigious gated community. Featuring luxury villas, a championship golf course, and panoramic views of the California Lighthouse and rugged North Coast.",
        "gallery": [
            "assets/Hotels/Tierra/golf_tierra_1.jpg",
            "assets/Hotels/Tierra/golf_tierra_2.jpg",
            "assets/Hotels/Tierra/golf_tierra_3.jpg",
            "assets/Hotels/Tierra/golf_tierra_4.jpg",
            "assets/Hotels/Tierra/golf_tierra_5.jpg"
        ],
        "video": "assets/Hotels/Tierra/golf_tierra.mp4"
    },
    "Selection": {
        "type": "club",
        "title": "Iberostar Selection",
        "sub": "Coming Soon",
        "desc": "Bringing the premium Selection family experience to the Caribbean. Designed for families who refuse to compromise on luxury.",
        "gallery": [
            "assets/Hotels/Selection/hotel_selection_1.png"
        ],
        "video": ""
    },
    "Joia2": {
        "type": "club",
        "title": "Iberostar Joia (Lighthouse)",
        "sub": "In Development",
        "desc": "The next chapter of the Joia collection is currently in development. This exclusive property will feature unparalleled luxury and direct access to the island's most secluded beaches.",
        "gallery": [
            "assets/Hotels/Joia2/hotel_joia2_1.jpg"
        ],
        "video": ""
    },
    "TierraGolf": {
        "type": "golf",
        "title": "Tierra del Sol",
        "sub": "Championship Golf",
        "desc": "Play a round at Tierra del Sol, Aruba's premier 18-hole championship golf course designed by Robert Trent Jones II. Experience challenging play with sweeping ocean views on every hole.",
        "gallery": [
            "assets/Golf/Course/golf_1.jpg"
        ],
        "video": "assets/Hotels/Tierra/golf_tierra.mp4",
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
            "assets/Golf/Birds/birds_1.jpg",
            "assets/Golf/Birds/birds_3.jpg",
            "assets/Golf/Birds/birds_4.jpg",
            "assets/Golf/Birds/birds_5.jpg"
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
        "desc": "Guided off-road safari to Aruba's wild north coast. Includes water, snacks, and a professional tour guide. <div class=\"price-box\"><div class=\"price-row\"><span>ATV Single</span><strong>$160.00</strong></div><div class=\"price-row\"><span>ATV Double</span><strong>$200.00</strong></div><div class=\"price-row\"><span>UTV 2-Seater</span><strong>$230.00</strong></div><div class=\"price-row\"><span>UTV 3-Seater</span><strong>$305.00</strong></div><div class=\"price-row\"><span>UTV 4-Seater</span><strong>$380.00</strong></div><div class=\"price-row\"><span>UTV 5-Seater</span><strong>$420.00</strong></div><div class=\"price-row\"><span>UTV 6-Seater</span><strong>$480.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_utv_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "4 Hours",
        "time": "Morning: 9:30 AM–1:30 PM | Afternoon: 2:30–6:30 PM",
        "itinerary": [
            "Black Stone Beach",
            "3 Bridges",
            "Ayo Rock Formation",
            "Andicuri Beach (pass by)",
            "Baby Bridge",
            "Bushiribana Goldmill Ruins",
            "Wariruri Bridge (pass by)",
            "California Lighthouse",
            "Boca Catalina Beach (cliff jumping)"
        ],
        "essentials": [
            "Valid Driver's License",
            "Sunblock",
            "Sunglasses",
            "Bandana",
            "Old clothes",
            "Optional: +$20 for lunch or dinner & a drink"
        ]
    },
    "GoKart": {
        "type": "fun",
        "title": "Bushiri Karting Speedway",
        "sub": "Rocka Beach Tours",
        "desc": "Outdoor karting at Bushiri Karting Speedway: a safety briefing, 1 practice race, 1 lap-position race, and 1 final race, with medals and champagne for the winners. Hotel pickup/drop-off, water, and snacks included. <div class=\"price-box\"><div class=\"price-row\"><span>Race Experience (Adult)</span><strong>$85.00</strong></div><div class=\"price-row\"><span>Race Experience (Child)</span><strong>$60.00</strong></div><div class=\"price-row\"><span>Arrive & Drive (Adult)</span><strong>$25.00</strong></div><div class=\"price-row\"><span>Arrive & Drive (Child)</span><strong>$25.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_gokart_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "2 Hours",
        "time": "3:30 PM - 5:30 PM",
        "essentials": [
            "Closed-toe shoes required",
            "Junior drivers (8-15) must be accompanied by a parent/guardian (18+)"
        ]
    },
    "Rentals": {
        "type": "fun",
        "title": "UTV & ATV Rentals",
        "sub": "Rocka Beach Tours",
        "desc": "Freedom to explore at your own pace — ATV & UTV drop-off and pickup available at all hotels. Security Deposit: $500 per vehicle required. <div class=\"price-box\"><div class=\"price-row\"><span>UTV 2-Seater (4 hr)</span><strong>$230.00</strong></div><div class=\"price-row\"><span>UTV 2-Seater (8 hr)</span><strong>$275.00</strong></div><div class=\"price-row\"><span>UTV 3-Seater (4 hr)</span><strong>$305.00</strong></div><div class=\"price-row\"><span>UTV 3-Seater (8 hr)</span><strong>$320.00</strong></div><div class=\"price-row\"><span>UTV 4-Seater (4 hr)</span><strong>$380.00</strong></div><div class=\"price-row\"><span>UTV 4-Seater (8 hr)</span><strong>$395.00</strong></div><div class=\"price-row\"><span>UTV 5-Seater (4 hr)</span><strong>$420.00</strong></div><div class=\"price-row\"><span>UTV 5-Seater (8 hr)</span><strong>$435.00</strong></div><div class=\"price-row\"><span>UTV 6-Seater (4 hr)</span><strong>$480.00</strong></div><div class=\"price-row\"><span>UTV 6-Seater (8 hr)</span><strong>$495.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_rentals_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "4 or 8 Hours",
        "essentials": [
            "Valid Driver's License",
            "Minimum driver age: 18"
        ]
    },
    "HalfIsland": {
        "type": "fun",
        "title": "Beach Bus Adventure",
        "sub": "Rocka Beach Tours",
        "desc": "Full-day tour visiting key landmarks and beaches across the island, with an optional lunch or dinner add-on. <div class=\"price-box\"><div class=\"price-row\"><span>Adult (13+)</span><strong>$65.00</strong></div><div class=\"price-row\"><span>Child (4-12)</span><strong>$42.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_half_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "5-7 Hours",
        "time": "10:00 AM – 5:00 PM | Pickup: 9:30–9:50 AM",
        "itinerary": [
            "Alto Vista Chapel",
            "California Lighthouse",
            "Casibari Rock Formation",
            "Bushiribana Gold Mill Ruins",
            "Matividiri Bay",
            "Natural Bridge",
            "Optional: Arashi Beach break or Boca Catalina/Tres Trapi cliff jumping"
        ]
    },
    "SailingCoralSunset": {
        "type": "fun",
        "title": "Coral Sunset Dinner Sail",
        "sub": "Rocka Beach Tours • Tropical Sailing Aruba",
        "desc": "A 3-hour sunset sail with a 3-course dinner and premium open bar. Choose one appetizer and one main course per guest, plus two shared side dishes; dessert included. Private charter — the boat is exclusively yours. <div class=\"price-box\"><div class=\"price-row\"><span>1-2 Guests</span><strong>$850.00</strong></div><div class=\"price-row\"><span>Each Additional Guest (up to 6)</span><strong>$200.00</strong></div><div class=\"price-row\"><span>6 Guests</span><strong>$1,600.00</strong></div><div class=\"price-row\"><span>Add-on: 4oz Rock Lobster Tail or 4pc Jumbo Shrimp</span><strong>$25.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_sail_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "3 Hours",
        "time": "4:00 PM – 7:00 PM",
        "essentials": [
            "Notify us in advance of any food allergies or dietary needs"
        ]
    },
    "SailingBlueParrot": {
        "type": "fun",
        "title": "Blue Parrot Snorkel Sail",
        "sub": "Rocka Beach Tours • Tropical Sailing Aruba",
        "desc": "A 4-hour snorkel sail with lunch or a 4-course dinner and premium open bar. Choose from two rounds of tapas plus a main course per guest, with shared sides and dessert. Private charter — the boat is exclusively yours. <div class=\"price-box\"><div class=\"price-row\"><span>1-2 Guests</span><strong>$1,100.00</strong></div><div class=\"price-row\"><span>Each Additional Guest (up to 6)</span><strong>$250.00</strong></div><div class=\"price-row\"><span>6 Guests</span><strong>$2,100.00</strong></div><div class=\"price-row\"><span>Add-on: 4oz Rock Lobster Tail or 4pc Jumbo Shrimp</span><strong>$25.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_sail_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "4 Hours",
        "time": "9:00 AM – 1:00 PM or 3:00 PM – 7:00 PM",
        "essentials": [
            "Notify us in advance of any food allergies or dietary needs"
        ]
    },
    "SailingTropicalDream": {
        "type": "fun",
        "title": "Tropical Dream Snorkel & Dinner Sail",
        "sub": "Rocka Beach Tours • Tropical Sailing Aruba",
        "desc": "A 7-hour snorkel charter to the Spanish Lagoon, Boca Catalina, and the Antilla shipwreck, with a 4-course lunch or early dinner and premium open bar. Private charter — the boat is exclusively yours. <div class=\"price-box\"><div class=\"price-row\"><span>1-2 Guests</span><strong>$1,500.00</strong></div><div class=\"price-row\"><span>Each Additional Guest (up to 6)</span><strong>$400.00</strong></div><div class=\"price-row\"><span>6 Guests</span><strong>$3,100.00</strong></div><div class=\"price-row\"><span>Add-on: 4oz Rock Lobster Tail or 4pc Jumbo Shrimp</span><strong>$25.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_sail_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "7 Hours",
        "time": "9:00 AM – 4:00 PM or 1:00 PM – 7:00 PM",
        "itinerary": [
            "Spanish Lagoon",
            "Boca Catalina",
            "Antilla Shipwreck"
        ],
        "essentials": [
            "Notify us in advance of any food allergies or dietary needs"
        ]
    },
    "SailingNonPrivate": {
        "type": "fun",
        "title": "Tropical Sailing Experience",
        "sub": "Rocka Beach Tours • Tropical Sailing Aruba",
        "desc": "A 4-hour sailing and snorkeling outing starting with a fruit bowl, then a BBQ lunch or BBQ sunset dinner with premium open bar. <div class=\"price-box\"><div class=\"price-row\"><span>Adult</span><strong>$135.00</strong></div><div class=\"price-row\"><span>Child</span><strong>$75.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_sail_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "essentials": [
            "Notify us in advance of any food allergies or dietary needs"
        ],
        "duration": "4 Hours",
        "time": "9:00 AM – 1:00 PM or 3:00 PM – 7:00 PM"
    },
    "SpaPromo": {
        "type": "spa",
        "title": "Swedish Massage (50min)",
        "sub": "Complimentary Voucher",
        "desc": "Relax and unwind with our signature 50-minute Swedish massage. Designed to relieve tension and improve circulation, this complimentary treatment is the perfect way to start your vacation.",
        "gallery": [
            "assets/Spa/Promo/massage_1.jpg",
            "assets/Spa/Promo/massage_2.jpg",
            "assets/Spa/Promo/massage_3.jpg",
            "assets/Spa/Promo/massage_4.jpg",
            "assets/Spa/Promo/massage_5.jpg",
            "assets/Spa/Promo/massage_6.jpg",
            "assets/Spa/Promo/massage_7.jpg",
            "assets/Spa/Promo/massage_8.jpg"
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
            "assets/Spa/General/spa_1.jpg",
            "assets/Spa/General/spa_2.jpg",
            "assets/Spa/General/spa_3.jpg",
            "assets/Spa/General/spa_4.jpg",
            "assets/Spa/General/spa_5.jpg",
            "assets/Spa/General/spa_6.jpg",
            "assets/Spa/General/spa_7.jpg",
            "assets/Spa/General/spa_8.jpg",
            "assets/Spa/General/spa_9.jpg",
            "assets/Spa/General/spa_10.jpg",
            "assets/Spa/General/spa_11.jpg"
        ]
    },
    "Giannis": {
        "type": "food",
        "title": "Gianni's Ristorante",
        "sub": "Italian",
        "desc": "Famous for the Spaghetti al Formaggio Parmigiano. Watch as your pasta is prepared tableside in a giant wheel of cheese, a true Italian classic.",
        "gallery": [
            "assets/Restaurants/Gianni's Ristorante/rest_giannis_1.jpg",
            "assets/Restaurants/Gianni's Ristorante/rest_giannis_2.jpg",
            "assets/Restaurants/Gianni's Ristorante/rest_giannis_3.jpg",
            "assets/Restaurants/Gianni's Ristorante/rest_giannis_4.jpg",
            "assets/Restaurants/Gianni's Ristorante/rest_giannis_5.jpg"
        ],
        "pdf": "assets/Restaurants/Gianni's Ristorante/menu_giannis.pdf"
    },
    "Daniels": {
        "type": "food",
        "title": "Daniel's Steak & Chop",
        "sub": "Steakhouse",
        "desc": "Premium Certified Angus Beef and wood-fired chops. A classic steakhouse experience with a rustic touch, perfect for meat lovers seeking quality cuts.",
        "gallery": [
            "assets/Restaurants/Daniel's Steak & Chop/rest_daniels_1.jpg",
            "assets/Restaurants/Daniel's Steak & Chop/rest_daniels_2.jpg",
            "assets/Restaurants/Daniel's Steak & Chop/rest_daniels_3.jpg",
            "assets/Restaurants/Daniel's Steak & Chop/rest_daniels_4.jpg",
            "assets/Restaurants/Daniel's Steak & Chop/rest_daniels_5.jpg"
        ],
        "pdf": "assets/Restaurants/Daniel's Steak & Chop/menu_daniels.pdf"
    },
    "Gaya": {
        "type": "food",
        "title": "GAIA House of Grill",
        "sub": "Joia Aruba • Open-Air Grill",
        "desc": "An open-air grill at the front of the hotel overlooking Eagle Beach, named for the Greek goddess of the Earth. Executive Chef Alejandro Camurri leads a menu built around a balance of land and sea, with bold, smoky, Caribbean-inflected flavors. Saturdays after 10pm, GAIA transforms into an intimate lounge with handcrafted cocktails and a live DJ.",
        "gallery": []
    },
    "Azia": {
        "type": "food",
        "title": "Azia Restaurant & Lounge",
        "sub": "Asian Fusion",
        "desc": "A journey through Asia with Tapas and modern atmosphere. Exquisite sushi, dim sum, and Asian-fusion dishes in a stylish, Zen-inspired environment.",
        "gallery": [
            "assets/Restaurants/Azia Restaurant/rest_azia_1.jpg",
            "assets/Restaurants/Azia Restaurant/rest_azia_2.jpg",
            "assets/Restaurants/Azia Restaurant/rest_azia_3.jpg",
            "assets/Restaurants/Azia Restaurant/rest_azia_4.jpg",
            "assets/Restaurants/Azia Restaurant/rest_azia_5.jpg"
        ],
        "pdf": "assets/Restaurants/Azia Restaurant/menu_azia.pdf"
    },
    "Azzurro": {
        "type": "food",
        "title": "Azzurro Ristorante",
        "sub": "Seafood",
        "desc": "Located right on the beach, serving authentic Italian seafood. Enjoy panoramic ocean views and fresh catches prepared with traditional Italian flair.",
        "gallery": [
            "assets/Restaurants/Azzurro Ristorante/rest_azzurro_1.jpg",
            "assets/Restaurants/Azzurro Ristorante/rest_azzurro_2.jpg",
            "assets/Restaurants/Azzurro Ristorante/rest_azzurro_3.jpg",
            "assets/Restaurants/Azzurro Ristorante/rest_azzurro_4.jpg",
            "assets/Restaurants/Azzurro Ristorante/rest_azzurro_5.jpg"
        ],
        "pdf": "assets/Restaurants/Azzurro Ristorante/menu_azzurro.pdf"
    },
    "AmoreMio": {
        "type": "food",
        "title": "Amore Mio",
        "sub": "Pizzeria",
        "desc": "Authentic Neapolitan pizza with a crispy, airy crust. A cozy pizzeria offering a variety of traditional toppings and Italian comfort food.",
        "gallery": [
            "assets/Restaurants/Amore Mio/rest_amoremio_1.jpg",
            "assets/Restaurants/Amore Mio/rest_amoremio_2.jpg",
            "assets/Restaurants/Amore Mio/rest_amoremio_3.jpg",
            "assets/Restaurants/Amore Mio/rest_amoremio_4.jpg",
            "assets/Restaurants/Amore Mio/rest_amoremio_5.jpg"
        ],
        "pdf": "assets/Restaurants/Amore Mio/menu_amoremio.pdf"
    },
    "Dushi": {
        "type": "food",
        "title": "Dushi Bagels",
        "sub": "Casual",
        "desc": "The go-to spot for New York style bagels and hearty burgers. A casual, friendly eatery perfect for breakfast or a quick, delicious lunch.",
        "gallery": [
            "assets/Restaurants/Dushi Bagels & Burgers/rest_dushi_1.jpg",
            "assets/Restaurants/Dushi Bagels & Burgers/rest_dushi_2.jpg",
            "assets/Restaurants/Dushi Bagels & Burgers/rest_dushi_3.jpg",
            "assets/Restaurants/Dushi Bagels & Burgers/rest_dushi_4.jpg",
            "assets/Restaurants/Dushi Bagels & Burgers/rest_dushi_5.jpg"
        ],
        "pdf": "assets/Restaurants/Dushi Bagels & Burgers/menu_dushi.pdf"
    },
    "Zima": {
        "type": "food",
        "title": "Zima Rooftop Bar",
        "sub": "Joia Aruba • Rooftop",
        "desc": "Perched atop the Joia hotel, Zima Bar offers the best sunset views. Enjoy handcrafted cocktails and a sophisticated atmosphere while watching the sun dip below the horizon.",
        "gallery": [
            "assets/Restaurants/Zima/rest_zima_1.jpg",
            "assets/Restaurants/Zima/rest_zima_2.jpg",
            "assets/Restaurants/Zima/rest_zima_3.jpg",
            "assets/Restaurants/Zima/rest_zima_4.jpg",
            "assets/Restaurants/Zima/rest_zima_5.jpg",
            "assets/Restaurants/Zima/rest_zima_6.jpg",
            "assets/Restaurants/Zima/rest_zima_7.jpg",
            "assets/Restaurants/Zima/rest_zima_9.jpg",
            "assets/Restaurants/Zima/rest_zima_10.jpg",
            "assets/Restaurants/Zima/rest_zima_11.jpg",
            "assets/Restaurants/Zima/rest_zima_12.jpg",
            "assets/Restaurants/Zima/rest_zima_13.jpg"
        ]
    },
    "Bucatini": {
        "type": "food",
        "title": "Bucatini",
        "sub": "Joia Aruba • Italian",
        "desc": "Modern Italian cuisine featuring a curated Antipasto station. Indulge in fresh pasta, artisanal pizzas, and a wide selection of fine wines in an elegant setting.",
        "gallery": [
            "assets/Restaurants/Bucatini/rest_bucatini_1.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_2.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_3.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_4.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_5.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_6.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_7.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_8.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_9.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_10.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_11.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_12.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_13.jpg",
            "assets/Restaurants/Bucatini/rest_bucatini_14.jpg"
        ]
    },
    "Marea": {
        "type": "food",
        "title": "Marea",
        "sub": "Joia Aruba • Caribbean",
        "desc": "Vibrant Caribbean flavors right on the oceanfront. Savor fresh seafood and local specialties while listening to the soothing sounds of the waves.",
        "gallery": [
            "assets/Restaurants/Marea/rest_marea_1.jpg",
            "assets/Restaurants/Marea/rest_marea_2.jpg",
            "assets/Restaurants/Marea/rest_marea_3.jpg",
            "assets/Restaurants/Marea/rest_marea_4.jpg",
            "assets/Restaurants/Marea/rest_marea_5.jpg",
            "assets/Restaurants/Marea/rest_marea_6.jpg",
            "assets/Restaurants/Marea/rest_marea_7.jpg",
            "assets/Restaurants/Marea/rest_marea_8.jpg",
            "assets/Restaurants/Marea/rest_marea_9.jpg",
            "assets/Restaurants/Marea/rest_marea_10.jpg",
            "assets/Restaurants/Marea/rest_marea_11.jpg",
            "assets/Restaurants/Marea/rest_marea_12.jpg",
            "assets/Restaurants/Marea/rest_marea_13.jpeg"
        ]
    },
    "Birdie": {
        "type": "food",
        "title": "The Birdie",
        "sub": "Tierra del Sol",
        "desc": "Experience the \"Tapas Affair\" with breathtaking views. Located at Tierra del Sol, this spot offers a unique blend of small plates and scenic golf course vistas.",
        "gallery": [
            "assets/Restaurants/Birdie/rest_birdie_1.jpg",
            "assets/Restaurants/Birdie/rest_birdie_2.jpg",
            "assets/Restaurants/Birdie/rest_birdie_3.jpg",
            "assets/Restaurants/Birdie/rest_birdie_4.jpg",
            "assets/Restaurants/Birdie/rest_birdie_5.jpg",
            "assets/Restaurants/Birdie/rest_birdie_6.jpg",
            "assets/Restaurants/Birdie/rest_birdie_7.jpg"
        ]
    },
    "Screaming": {
        "type": "food",
        "title": "Screaming Eagle",
        "sub": "French Fusion",
        "desc": "Inspired by French-fusion cuisine, known for its \"Dinner in Bed\" experience. A chic and trendy spot offering innovative dishes and a romantic ambiance.",
        "gallery": [
            "assets/Restaurants/Screaming Eagle/rest_screaming_1.jpg",
            "assets/Restaurants/Screaming Eagle/rest_screaming_2.jpg",
            "assets/Restaurants/Screaming Eagle/rest_screaming_3.jpg",
            "assets/Restaurants/Screaming Eagle/rest_screaming_4.jpg",
            "assets/Restaurants/Screaming Eagle/rest_screaming_5.jpg"
        ],
        "pdf": "assets/Restaurants/Screaming Eagle/menu_screaming.pdf"
    },
    "JeepTourA": {
        "type": "fun",
        "title": "Jeep Tour A: Northshore Safari",
        "sub": "Rocka Beach Tours",
        "desc": "Open-air Jeep safari along Aruba's rugged north coast, with dramatic oceanfront views. <div class=\"price-box\"><div class=\"price-row\"><span>Adult</span><strong>$97.00</strong></div><div class=\"price-row\"><span>Child (4-12)</span><strong>$75.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_jeep_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "4-6 Hours",
        "time": "Pickup: 8:15–8:30 AM (Highrise) | 8:30–8:45 AM (Lowrise)",
        "itinerary": [
            "Ayo Rock Formation",
            "Black Stone Beach",
            "3 Bridges",
            "Andicuri Beach",
            "Baby Bridge",
            "Bushiribana Goldmill Ruins",
            "Wariruri Bridge",
            "California Lighthouse",
            "Boca Catalina Beach (cliff jumping)"
        ],
        "essentials": [
            "Swimwear",
            "Towel",
            "Sunscreen",
            "Sturdy sandals or shoes",
            "Snorkel equipment included",
            "Optional: +$20 for lunch or dinner & a drink"
        ]
    },
    "JeepTourB": {
        "type": "fun",
        "title": "Jeep Tour B: Natural Pool, Caves & Baby Beach",
        "sub": "Rocka Beach Tours",
        "desc": "Open-air Jeep safari through Arikok National Park to the island's natural pool and caves, with a professional guide. <div class=\"price-box\"><div class=\"price-row\"><span>Adult</span><strong>$97.00</strong></div><div class=\"price-row\"><span>Child (4-12)</span><strong>$75.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_jeep_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "4-6 Hours",
        "time": "Pickup: 8:15–8:30 AM (Highrise) | 8:30–8:45 AM (Lowrise)",
        "itinerary": [
            "Arikok National Park",
            "Natural Pool (Conchi)",
            "Fontein Cave (Arawak drawings)",
            "Boca Prins",
            "Quadirikiri Cave",
            "Red Anchor",
            "Baby Beach",
            "San Nicolas Art City"
        ],
        "essentials": [
            "Swimwear",
            "Towel",
            "Sunscreen",
            "Sturdy sandals or shoes",
            "Snorkel equipment included",
            "National Park entry included",
            "Optional: +$20 for lunch or dinner & a drink"
        ]
    },
    "SailingAngelfish": {
        "type": "fun",
        "title": "Angelfish Snorkel & Brunch",
        "sub": "Rocka Beach Tours • Tropical Sailing Aruba",
        "desc": "A 3-hour snorkel sail with brunch-style tapas and a premium open bar with mimosas. Private charter — the boat is exclusively yours. <div class=\"price-box\"><div class=\"price-row\"><span>1-2 Guests</span><strong>$700.00</strong></div><div class=\"price-row\"><span>Each Additional Guest (up to 6)</span><strong>$150.00</strong></div><div class=\"price-row\"><span>6 Guests</span><strong>$1300.00</strong></div><div class=\"price-row\"><span>Each Additional Guest (up to 15)</span><strong>$100.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_sail_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "3 Hours",
        "time": "9:00 AM – 12:00 PM or 4:00 PM – 7:00 PM",
        "essentials": [
            "Private charter (your own group only)",
            "Notify us in advance of any food allergies or dietary needs"
        ]
    },
    "UTVJeepNaturalPool": {
        "type": "fun",
        "title": "UTV & Safari Jeep Natural Pool Adventure",
        "sub": "Rocka Beach Tours",
        "desc": "A hybrid tour: drive your own UTV to the Natural Pool, then swap into a guided Jeep safari for the rest of the route. Includes a meal with a drink and national park entrance. <div class=\"price-box\"><div class=\"price-row\"><span>2-Seater UTV</span><strong>$285.00</strong></div></div>",
        "gallery": [
            "assets/Activities/Rockabeach/act_utv_1.jpg"
        ],
        "partnerLogo": "assets/Logos/logo_rocka.png",
        "duration": "4 Hours",
        "itinerary": [
            "Natural Pool (Conchi)",
            "Natural Bridge (UTV/Jeep swap point)",
            "Bushiribana Gold Mill Ruins (fly-by)",
            "Alto Vista Chapel (fly-by)",
            "California Lighthouse (fly-by)",
            "Boca Catalina Beach or Tres Trapi (cliff jumping)"
        ],
        "essentials": [
            "Valid Driver's License",
            "Sunglasses",
            "Swimwear",
            "Towel",
            "Sunscreen",
            "National Park entry included"
        ]
    }
};
