const LEVELS = [
{
  id: "q", name: "Qualified guests", sub: "Q · full gift", icon: "usercheck",
  notes: [
    { h: "USA & Canada · Q (full gift)", li: [
      "Ages 32 to 70. The man's age counts. In a same-sex couple, either one.",
      "Married or living together.",
      "Single women: USA only, ages 40 to 65.",
      "One of them employed or retired.",
      "Visa, Mastercard, American Express or Discover.",
      "Both fluent in English, or both fluent in Spanish.",
      "Staying at a hotel, timeshare or rental, and paying for it." ] },
    { h: "Latin America & Caribbean · Q", li: [
      "Not Aruba, Cuba, Venezuela, Haiti or Ecuador.",
      "Ages 40 to 60. The man's age counts.",
      "Married or living together. No singles.",
      "One must be employed. No retirees.",
      "Visa, Mastercard or Amex. No Discover.",
      "Same language and paid-accommodation rules." ] },
    { h: "Argentina · Q", li: [ "Ages 45 to 55. The man's age counts." ] },
    { h: "Time they need", li: [
      "Presentation: 90 minutes, breakfast included.",
      "They need 3 free hours that morning, with no paid activities.",
      "Departure day: 4 hours before airport pickup, or 5 hours before the flight if they rent a car." ] }
  ],
  qs: [
    Q("q1","USA or Canada couple. What ages get the full gift (Q)?","32 to 70",["28 to 70","35 to 65","40 to 60"],"USA & Canada Q is 32 to 70. Ages 28 to 31 and 71+ are CT, half gift."),
    Q("q2","In a couple, whose age decides if they qualify?","The man's age",["The woman's age","Whoever is older","The average of both"],"The man qualifies the age."),
    Q("q3","Same-sex couple. Whose age counts?","Either one of them",["Only the oldest","Only the youngest","Same-sex couples can't qualify"],"In a same-sex couple, either partner can qualify the age."),
    Q("q4","Which single guests can be Q?","Single women from the USA, 40 to 65",["Any single from USA or Canada, 32 to 70","Single men from the USA, 40 to 65","No singles ever qualify"],"Only single women, only from the USA, only ages 40 to 65."),
    Q("q5","USA or Canada Q. What's the work rule?","One of them employed or retired",["Both must be employed","No retirees allowed","Work doesn't matter"],"USA & Canada: one must be gainfully employed or retired."),
    Q("q6","Which cards work for a USA or Canada Q?","Visa, Mastercard, Amex or Discover",["Visa or Mastercard only","Any debit card","A cash deposit"],"USA & Canada Q: Visa, Mastercard, American Express or Discover."),
    Q("q7","What's the language rule?","Both fluent in English, or both fluent in Spanish",["One of them speaks English","Any language with a translator","English only"],"Both must speak the same language fluently: English or Spanish."),
    Q("q8","What's the accommodation rule?","Staying at a hotel, timeshare or rental, and paying for it",["Anywhere, even free at a friend's place","Only guests of Iberostar hotels","Only all-inclusive guests"],"They must be paying for where they stay."),
    Q("q9","How long is the presentation?","90 minutes, breakfast included",["45 minutes","60 minutes plus breakfast","2 hours"],"90 minutes including breakfast."),
    Q("q10","How much free time do guests need that morning?","3 hours, with no paid activities",["90 minutes","2 hours","Until noon"],"3 hours total with no paid activities."),
    Q("q11","Day of departure. What's the latest they can tour?","4 hours before airport pickup (5 before the flight with a rental car)",["2 hours before the flight","Any time before checkout","They can't tour on departure day"],"4 hours before pickup, or 5 hours before flight time if they're renting a car."),
    Q("q12","Latin America & Caribbean couple. Q ages?","40 to 60",["32 to 70","45 to 55","35 to 65"],"Latin America & Caribbean Q is 40 to 60, the man's age."),
    Q("q13","Which countries are left out of the Latin America & Caribbean rules?","Aruba, Cuba, Venezuela, Haiti & Ecuador",["Argentina, Brazil & Chile","Mexico, Colombia & Peru","Costa Rica, Panama & Jamaica"],"Aruba, Cuba, Venezuela, Haiti and Ecuador are excluded."),
    Q("q14","Colombian couple, both 55, both retired. What are they?","NQ. Latin America needs one of them working",["Q. Retirees are fine everywhere","CT, half gift","Q if they show a Visa"],"Latin America & Caribbean: one must be employed. No retirees."),
    Q("q15","Which card does NOT work for a Latin America Q?","Discover",["Visa","Mastercard","American Express"],"Latin America & Caribbean: Visa, Mastercard or Amex only."),
    Q("q16","Argentinian couple. Q ages?","45 to 55",["40 to 60","32 to 70","35 to 70"],"Argentina Q is 45 to 55, the man's age."),
    Q("q17","Can single guests from Latin America qualify?","No. Married or living together only",["Yes, single women 40 to 65","Yes, anyone 40 to 60","Only if retired"],"No singles from Latin America & Caribbean."),
    MATCH("mq","Match each group to its full-gift (Q) ages",[["USA & Canada couple","32 to 70"],["Latin America couple","40 to 60"],["Argentinian couple","45 to 55"],["USA single woman","40 to 65"]],"Q ages: USA & Canada 32 to 70, Latin America 40 to 60, Argentina 45 to 55, USA single women 40 to 65.")
  ]
},
{
  id: "ctnq", name: "Half gift & no gift", sub: "CT · NQ · extra rules", icon: "gift",
  notes: [
    { h: "Courtesy Tour (CT) · half gift · USA & Canada", li: [
      "Ages 28 to 31, or 71 and up.",
      "Married or living together. One employed or retired.",
      "A debit card is OK, or Visa, Mastercard, Amex, Discover.",
      "Same language and paid-accommodation rules.",
      "Presentation: minimum 60 minutes." ] },
    { h: "Courtesy Tour (CT) · Argentina", li: [
      "Ages 35 to 44 and 56 to 70 (the man's age).",
      "No singles. No retirees. Visa, Mastercard or Amex.",
      "90-minute presentation with breakfast, 3 free hours." ] },
    { h: "Non-Qualified (NQ) · no gift", li: [
      "Anyone who doesn't meet Q or CT, plus:",
      "Travel agents and tour operators.",
      "Commercial airline pilots and crew (flight attendants).",
      "Active US military: Army, Air Force, Marines, Navy, Coast Guard. National Guard is OK.",
      "Employees of hotel, timeshare and vacation club companies.",
      "Toured Iberostar in-house in the last 6 months, or a street program in the last 12 months.",
      "Trinella / Trifecta: three couples or more traveling together." ] },
    { h: "Extra rules", li: [
      "Guests show IDs and credit card to the hostess.",
      "Max party: 6 people, max 4 adults (18+).",
      "Quinella: two qualified couples together. 2 invitations, 2 gifts, 1 pay. Sales decides if they tour together.",
      "Paid activities: excursions, spa, pre-arranged transfers, anything prepaid.",
      "Shirts and shoes. No bathing suits.",
      "The Club members staying off property: the GI team may invite them. Q if they bring IDs and card.",
      "The Club beneficiaries staying off property: can't be invited. NQ." ] }
  ],
  qs: [
    Q("c1","What does a CT guest get?","Half gift",["Full gift","No gift","Double gift"],"Q = full gift, CT = half gift, NQ = no gift."),
    Q("c2","USA or Canada CT ages?","28 to 31, or 71 and up",["25 to 31","18 to 31, or 65 and up","71 and up only"],"CT for USA & Canada: 28 to 31 or 71+."),
    Q("c3","Which card can a USA or Canada CT show?","A debit card, or Visa / Mastercard / Amex / Discover",["Credit card only","Amex only","No card needed"],"CT is the only group where a debit card is OK."),
    Q("c4","Minimum presentation for a USA or Canada CT?","60 minutes",["30 minutes","90 minutes","2 hours"],"CT USA & Canada: minimum 60 minutes."),
    Q("c5","Argentinian couple. CT ages?","35 to 44 and 56 to 70",["28 to 31 and 71+","30 to 44 and 56+","40 to 60"],"Argentina CT: 35 to 44 and 56 to 70. Q is 45 to 55 in the middle."),
    Q("c6","Which job makes a guest NQ?","Commercial airline pilot or flight attendant",["Nurse","Police officer","Teacher"],"Pilots and crew are NQ."),
    Q("c7","Which military guest can still qualify?","National Guard",["Active US Army","Active US Navy","Active Coast Guard"],"Active US military is NQ. National Guard is permitted."),
    Q("c8","Guest works at a timeshare resort in Orlando. They are…","NQ",["Q","CT","Q, but half gift"],"Employees of hotel, timeshare and vacation club companies are NQ."),
    Q("c9","Travel agents and tour operators are…","NQ",["Q","CT","Q with a manager's OK"],"Travel agents and tour operators are NQ."),
    Q("c10","Toured Iberostar in-house within the last ___ months = NQ.","6",["3","12","24"],"In-house: 6 months. Street programs: 12 months."),
    Q("c11","Toured an Iberostar street program within the last ___ months = NQ.","12",["6","3","24"],"Street programs: 12 months. In-house: 6 months."),
    Q("c12","Three couples or more traveling together (Trinella / Trifecta).","NQ",["Q, 3 gifts","Q, 1 gift shared","CT for everyone"],"Trinella / Trifecta is NQ."),
    Q("c13","Quinella: two qualified couples together. What happens?","2 invitations, 2 gifts, 1 pay. Sales decides if they tour together",["1 invitation, 1 gift","2 invitations, 1 gift, 2 pays","NQ. Groups aren't allowed"],"Quinella: 2 invitations, 2 gifts, 1 pay."),
    Q("c14","Maximum party size?","6 people, max 4 adults (18+)",["4 people total","8 people, max 6 adults","No limit with kids"],"Max 6 people, max 4 adults 18+."),
    Q("c15","What do guests show the hostess?","IDs and credit card",["Their hotel key card","A passport stamp","Just the invitation"],"IDs and credit card at hosting."),
    Q("c16","Which one counts as a paid activity?","A prepaid airport transfer",["A walk on Eagle Beach","Swimming at their hotel pool","Breakfast at their hotel"],"Excursions, spa, pre-arranged transfers or anything prepaid."),
    Q("c17","Dress code for the tour?","Shirts and shoes. No bathing suits",["Anything goes","Business casual","Bathing suit with a cover-up"],"Shirts and shoes required, no bathing suits."),
    Q("c18","An Iberostar The Club member is staying off property.","The GI team may invite them. Q if they bring IDs and card",["Always NQ","Automatically CT","Members never tour"],"Club members off property can be invited and count as Q with IDs and card."),
    Q("c19","An Iberostar The Club beneficiary is staying off property.","Can't be invited. NQ",["Q with IDs and card","CT, half gift","Q if they're 40 to 60"],"Beneficiaries staying off property are NQ."),
    MATCH("mc","Match each rule to its number",[["Toured Iberostar in-house","6 months"],["Toured a street program","12 months"],["Most people in one party","6"],["Most adults in one party","4"]],"In-house tour in the last 6 months, or a street program in the last 12 months, is NQ. A party is at most 6 people and 4 adults.")
  ]
},
{
  id: "who", name: "Who qualifies?", sub: "Real couples · Q, CT or NQ", icon: "couple",
  gen: true, count: 15,
  notes: [
    { h: "Read a couple in this order", li: [
      "Where are they from? USA & Canada, Argentina, Latin America & Caribbean, or an excluded country.",
      "The man's age. Which band is it in?",
      "Together? Married or living together. Singles: only USA women 40 to 65.",
      "Work: employed, or retired (retired is OK for USA & Canada only).",
      "Card: Discover is USA & Canada only. Debit only works for CT.",
      "Same language, paying for their stay, 3 free hours.",
      "Any NQ flag? Job, military, recent tour, 3+ couples." ] },
    { h: "Age bands (the man's age)", li: [
      "USA & Canada: under 28 NQ · 28 to 31 CT · 32 to 70 Q · 71+ CT",
      "Latin America & Caribbean: 40 to 60 Q · anything else NQ",
      "Argentina: 35 to 44 CT · 45 to 55 Q · 56 to 70 CT · else NQ",
      "Aruba, Cuba, Venezuela, Haiti, Ecuador: NQ" ] }
  ]
},
{
  id: "why", name: "Remove the doubt", sub: "Why before how · the good news", icon: "chat", script: [0, 1, 2],
  clips: ["01", "02", "03", "04"],
  notes: [
    { h: "Crawl, walk, run", li: [
      "Crawl: you can stop people.",
      "Walk: you can write invitations.",
      "Run: you make solid bookings that show up." ] },
    { h: "Give the WHY before the HOW", li: [
      "Guests doubt three things: that it's a scam, that it's timeshare, or that you're selling water sports and activities.",
      "Open with \"free breakfast and a gift\" and they think: it's a scam, it's not true, or it's timeshare. Let's run away.",
      "Tell them why you're inviting them first. Then what they get makes sense." ],
      say: "Yes folks, I'm part of the team inviting families to come see the newest hotel on the island. Once you've seen it, next time you travel you'll want to stay with us. It also helps us spread the word: you tell family and friends, maybe post a picture on Facebook or Instagram." },
    { h: "Then the good news, in this order", li: [
      "It's a full branding experience, not just a quick look at the hotel.",
      "Breakfast at one of our five-star restaurants.",
      "A personalized tour of the property: the facilities and the service.",
      "See one of our rooms.",
      "A reward for their time, as a way of saying thanks: IberoCash they use at the best restaurants, activity companies, dining and shopping on the island.",
      "The flyer adds one more: their taxi is on us, both ways." ] },
    { h: "Make it personal", li: [
      "See a Riu bracelet? \"You're probably eating breakfast at the same place every day. This is something new and different.\"",
      "We partner with the best (Gianni's, Screaming Eagle, Daniel's) because everybody wants to be associated with Iberostar.",
      "We've invested in Aruba: the Tierra del Sol golf course and community, our first hotel, and two more coming." ] },
    { h: "Ask for it", li: [
      "Say \"Let me get you an invitation.\" Not \"Would you like one?\"",
      "They either let you keep going, or they tell you their objections now.",
      "Timeshare already, don't want to commit, plans tomorrow: all can be worked.",
      "The only one you really can't beat: they leave tomorrow morning." ] }
  ],
  qs: [
    Q("w1","Crawl, walk, run. What is \"run\"?","Making solid bookings",["Stopping people","Writing invitations","Handing out flyers"],"Crawl = stop people. Walk = write invitations. Run = solid bookings that show up."),
    Q("w19","What doubts do you have to remove first?","That we're a scam, selling timeshare, or promoting water sports and activities",["That the hotel is far away","That breakfast costs extra","That they need a passport"],"Remove the doubt that we're a scam, timeshare, or an activities booth."),
    Q("w2","You open with \"Free breakfast and a gift!\" What do guests think?","It's a scam, it's not true, or it's timeshare",["Great, sign us up","Nothing. They just say no thanks","They want a bigger gift"],"Leading with the gift creates doubt. Lead with the why."),
    Q("w3","How do you remove that doubt?","Give the WHY before the HOW",["Talk faster","Lead with the gift","Say \"it's not timeshare\" right away"],"The why makes the offer believable."),
    LINE("w16","If you tell them ___ first, it removes the doubt.","why",["the gift","the price","the time"],"Why before how. Once they know why you're approaching them, the offer makes sense."),
    Q("w4","Which opener gives the why first?","\"We're inviting families to see the newest hotel on the island, so next time you travel you'll stay with us.\"",["\"Want free breakfast and a gift?\"","\"Have you been to Eagle Beach?\"","\"Do you own a timeshare?\""],"Why first: we want them to see it, love it, and stay with us."),
    Q("w5","Besides wanting them to stay with us, why else do we invite them?","They spread the word: family, friends, Facebook, Instagram",["To sell them excursions","To fill the restaurant","To collect emails"],"Guests who see it tell people. That's good marketing for us."),
    LINE("w20","We're actually inviting families for a full ___ experience, not just a quick look at the hotel.","branding",["sales","spa","dining"],"A full branding experience: breakfast, a personalized tour, a room, and a thank-you for their time."),
    Q("w6","After the why, in what order do you share the good news?","Breakfast → property tour → see a room → reward for their time",["Reward → breakfast → room → tour","Room → reward → breakfast → tour","Tour → reward → room → breakfast"],"Breakfast, a personalized tour, a room, and the reward last as a thank-you."),
    Q("w7","Guest is wearing a Riu bracelet. What do you say?","\"You're probably eating at the same place every day. This is something new and different.\"",["\"Riu is not as good as us.\"","\"Sorry, Riu guests can't come.\"","Nothing. Ignore it."],"Use what you see to make it personal: it's something new, something different for them."),
    LINE("w18","And the best part is, we also ___ you for your time, as a way of saying thanks.","reward",["pay","charge","upgrade"],"The gift is a thank-you for their time, and it comes last."),
    Q("w8","How do you present the gift?","As our way of saying thanks for their time",["As the main reason to come","As payment for buying","As a contest prize"],"The gift is a thank-you. The why is the reason."),
    Q("w9","Why do the best restaurants and activity companies partner with us?","Everybody wants to be associated with Iberostar",["We pay them double","We own all of them","It's required by law"],"Partners like Gianni's, Screaming Eagle and Daniel's want to be linked to the brand."),
    Q("w10","What shows guests we've invested in Aruba?","The Tierra del Sol golf course & community, our first hotel, two more coming",["The cruise terminal","The airport","A Palm Beach casino"],"Tierra del Sol, the new hotel, and two more on the way."),
    Q("w12","Why say \"Let me get you an invitation\" instead of asking?","They either let you continue, or they tell you their objections right now",["It's shorter","It sounds more polite","They can't say no to it"],"It brings their doubts out so you can work them."),
    Q("w13","\"We already own a timeshare.\" What is that?","An objection you can work with",["A reason to let them go","An automatic NQ","Only OK if they're from the USA"],"Owning timeshare is an objection we can overcome."),
    Q("w15","\"We have things planned tomorrow.\" What now?","Work the objection, like finding a time that fits",["Let them go right away","Promise it only takes 30 minutes","Offer a bigger gift"],"Plans tomorrow can be overcome. Never promise a shorter time."),
    BUILD("bw1","Ask for it, the trainer's way","Let me get you an invitation.",["Would","like"],"Don't ask if they want one. Say it: Let me get you an invitation."),
    LISTEN("lw1","02",7,9,"Listen to this opener. What's wrong with it?","It leads with the gift, so guests think scam or timeshare",["It's too long","It forgets the breakfast","It names the wrong beach"],"Lead with the why. Free breakfast and $200 up front sounds like a scam, not true, or timeshare."),
    LISTEN("lw2","04",10,10,"Listen. Which objection can't you overcome?","They're leaving tomorrow morning",["They already own timeshare","They don't want to commit","They have plans tomorrow"],"Everything else is a chance to overcome objections.")
  ]
},
{
  id: "offer", name: "The Open House offer", sub: "The flyer · gifts · partners", icon: "ticket", video: "video/golf-loop.mp4", poster: "video/golf-loop.jpg",
  imgs: [
    { src: "img/flyer-open-house.jpg", w: 1600, h: 900, cap: "The Open House flyer guests see",
      alt: "Open House Promotion flyer: Five Star Breakfast, VIP Property Tour, Island Gift of IberoCash, complimentary taxi. No timeshare, no high pressure, no obligation, short and sweet." },
    { src: "img/flyer-partners.jpg", w: 1364, h: 768, cap: "Our partners, our commitment and what to bring",
      alt: "Our Partners sheet with 16 partner logos, plus Our Commitment and What to Bring." }
  ],
  notes: [
    { h: "The offer, in the flyer's words", li: [
      "Five Star Breakfast: the hostesses check them in at the Main Lobby, then it's off to a complimentary breakfast at one of our restaurants.",
      "VIP Property Tour: a preview of the VIP features of the resort and suites, so they see what awaits their family when they choose Iberostar.",
      "Island Gift: to thank them for their time, a choice of IberoCash to enjoy with Aruba's top merchants. Dining, shopping, activities, rentals.",
      "Complimentary taxi: they arrange the taxi themselves. We pay the fare when they arrive, and again when they depart." ] },
    { h: "Four promises", li: [
      "No timeshare.", "No high pressure.", "No obligation.",
      "Short & sweet: 90 minutes, including the breakfast, property tour and information on booking direct." ] },
    { h: "Where and why", li: [
      "The Joia by Iberostar Resort, in the heart of Aruba's world-famous Eagle Beach.",
      "To tempt them to stay with us in the future, and to introduce Iberostar The Club, the newest and most luxurious way to travel.",
      "The Open House Promotion is our opportunity to impress them in person with our brand." ] },
    { h: "Our commitment", li: [
      "We do not sell timeshare: no weeks, points or maintenance fees.",
      "A full-service resort brand they can book through travel agents or online. We show how our Members book direct at wholesale rates through our loyalty club.",
      "No high pressure and no obligation to book or buy. If they fall in love with the club, we're happy to show them how to get involved." ] },
    { h: "What to bring", li: [
      "Their exclusive invitation, so they get everything they were promised.",
      "Every adult: 2 forms of ID, like a driver's license or passport, and a credit card, so we can register them and give them their gifts." ] },
    { h: "Our partners", li: [
      "At Joia: Marea, Bucatini, Gaia and the Zima rooftop bar.",
      "Dining around the island: Gianni's, Daniel's Steak & Chop, Azzurro, Azia, Amore Mio, Screaming Eagle, Dushi Bagels & Burgers, and The Birdie at Tierra del Sol.",
      "Golf: Tierra del Sol. Tours: Rocka Beach Tours. Shopping: Aruba Aloe. Car rental: Elixir Car Rental." ] }
  ],
  qs: [
    Q("o1","What's the promotion called?","Our Open House Promotion",["The Timeshare Preview","The VIP Sales Event","The Beach Breakfast Club"],"The flyer and the trainer both call it the Open House Promotion."),
    Q("o3","Which four promises are on the flyer?","No timeshare. No high pressure. No obligation. Short & sweet.",["Free stay. Free flight. Free spa. Free golf.","Members only. Book today. Pay later. Cash only.","No ID. No card. No breakfast. No tour."],"Say them the way the flyer does."),
    Q("o4","Where does the morning start?","In the Main Lobby, where the hostesses check them in",["At the beach bar","At a sales office downtown","At the golf course"],"Hostesses check them in at the Main Lobby, then it's off to a complimentary breakfast."),
    Q("o5","How does the complimentary taxi work?","They take a taxi themselves. We pay the fare when they arrive and again when they leave",["We send a shuttle to their hotel","We pay one way only","Only guests staying at Iberostar get it"],"\"Your taxi is on us! Please arrange your taxi yourself: we will pay the fare when you arrive, and again when you depart!\""),
    Q("o7","What is the Island Gift?","A choice of IberoCash to enjoy with Aruba's top merchants",["A free night at the hotel","Cash at the front desk","A discount on a timeshare week"],"To thank them for their time. IberoCash works for dining, shopping, activities and rentals."),
    Q("o8","IberoCash works for four kinds of things. Which list is right?","Dining, shopping, activities, rentals",["Flights, hotels, cruises, trains","Groceries, gas, pharmacy, phone bills","Casino chips, lottery tickets, bets, ATM cash"],"The flyer lists dining, shopping, activities and rentals."),
    Q("o14","What does every adult bring?","2 forms of ID, like a driver's license or passport, and a credit card",["Just the invitation","Their hotel key card","A printed hotel receipt"],"So we can register them and give them their gifts. They also bring the invitation."),
    LINE("o15","We'll show you how our Members book direct at ___ rates through our loyalty club.","wholesale",["retail","timeshare","weekly"],"Members book direct at wholesale rates. We don't sell timeshare: no weeks, points or maintenance fees."),
    LINE("o16","We only ask families for 90 minutes, including the breakfast, property tour, and information on ___.","booking direct",["buying a week","points and fees","the casino"],"We know vacation time is valuable. We're not going to take up their whole day."),
    LINE("o17","Our Open House Promotion is our opportunity to ___ you in person with our brand.","impress",["sell","sign","pressure"],"We hope they like what they see, tell family and friends, and stay with us on future vacations all over the world."),
    Q("o18","How does the flyer describe Iberostar The Club?","The newest and most luxurious way to travel",["A timeshare with points","A members-only resort","A cruise line"],"The Open House introduces them to Iberostar The Club, the newest and most luxurious way to travel."),
    PIC("pj","img/photos/joia-beach.jpg","The Joia by Iberostar resort on its beach","Where do guests go for the Open House?","The Joia by Iberostar Resort, on Eagle Beach",["A sales office in Oranjestad","A resort on Palm Beach","The Tierra del Sol clubhouse"],"The Joia by Iberostar Resort, in the heart of Aruba's world-famous Eagle Beach."),
    PIC("ps","img/photos/joia-suite.jpg","A Joia suite living room","On the VIP Property Tour, guests see…","The VIP features of the resort and its suites",["A timeshare sales office","An airport lounge","A model home for sale"],"So they see what awaits their family when they choose Iberostar in the future."),
    PIC("pm","img/photos/marea.jpg","A dish at Marea","Marea is…","A Caribbean restaurant at Joia",["A car rental partner","A golf course","A tour company"],"Marea, Bucatini, Gaia and the Zima rooftop bar are at Joia."),
    PIC("pg","img/photos/golf.jpg","The Tierra del Sol golf course","Tierra del Sol is…","The golf course and community Iberostar owns",["A beach club on Palm Beach","A car rental company","A cruise terminal"],"In the trainer's words: we own the Tierra del Sol golf course and community. The Birdie is its restaurant."),
    PIC("pr","img/photos/rocka.jpg","A Rocka Beach Tours jeep","Rocka Beach Tours offers…","Jeep tours, UTVs, karting and sailing",["Car rentals only","Fine dining","Spa treatments"],"Rocka Beach Tours is the tours partner."),
    MATCH("mo","Match each partner to what it is",[["Elixir","Car rental"],["Rocka Beach","Tours"],["Aruba Aloe","Shopping"],["Tierra del Sol","Golf"],["Zima","Rooftop bar at Joia"]],"Elixir rents cars, Rocka Beach runs tours, Aruba Aloe is shopping, Tierra del Sol is golf, Zima is the rooftop bar at Joia.")
  ]
},
{
  id: "solid", name: "Make it solid", sub: "Booking → show-up", icon: "calendar", script: [3, 4, 5, 6],
  clips: ["05", "06", "07", "08", "09"],
  notes: [
    { h: "Book the time", li: [
      "Say \"Let me put you down for 8 o'clock.\"",
      "If 8 is too early, offer 10. If they don't object, you've got an easy booking." ] },
    { h: "Slow down while you write", li: [
      "Once you're writing, you've got handcuffs on them. About 1 family in 100 walks off mid-invitation. It's manners.",
      "Keep making a friend. Ask small discovery questions. If they like you, trust you and believe you, they buy from you." ] },
    { h: "Phone number: tell them why", li: [
      "A manager or supervisor calls this afternoon, around 5 to 6 pm, only to check they can still make it. WhatsApp works.",
      "Explained this way they feel like VIPs and don't give a fake number." ],
      say: "Folks, we also do confirmation calls. If you give me your phone number, maybe you have WhatsApp, one of my managers can reach out this afternoon between 5 and 6, simply to ask if you're still able to make it. We're not allowed to solicit or anything like that." },
    { h: "Say what it really is", li: [
      "\"Bring this invitation with you to confirm which gift you were offered.\"",
      "Breakfast, a quick tour, and we show how to book direct through our loyalty club.",
      "We're not timeshare: no weeks, no points, no maintenance fees. A full-service hotel you can book through travel agents or Expedia.",
      "No obligation to be a member to stay with us. Members get discounts and cool perks.",
      "A real expectation gives them a spark of interest. Surprised guests close their eyes and ears." ] },
    { h: "Talk about time the right way", li: [
      "\"We only ask families for 90 minutes, and breakfast tends to eat about half of that.\"",
      "Never say 45 minutes or 30 minutes, or break it into minutes. Then the hostess says 90 and they feel lied to." ] },
    { h: "Lock it in before they walk", li: [
      "Don't just say \"have a nice day.\" Ask: \"So we see you guys tomorrow at 8 for sure?\"",
      "\"We'll try\" or \"we'll see\"? Go back: lots of families want to come, and we don't want to block a space.",
      "Still unsure? Offer to give the invitation to another family. A solid no beats a fake yes.",
      "You can tell them: \"I get a $65 bonus just for you showing up. You don't have to book or buy anything.\"",
      "Your job isn't handing out invitations. It's getting people to the hotel." ] }
  ],
  qs: [
    Q("s3","While writing the invitation you should…","Slow down, make a friend, ask discovery questions",["Hurry before they change their mind","Stay quiet and just write","Hand them the pen to fill it in"],"This is the best moment to build the bond."),
    Q("s4","Why is it safe to slow down while writing?","Only about 1 family in 100 walks away mid-invitation. It's manners",["They signed something","The gift is already promised","A manager is watching"],"Once you're writing, you've got handcuffs on them."),
    LINE("s5","If they like you, ___ you and ___ you, they will buy from you.","trust · believe",["tip · thank","follow · call","hear · see"],"Like, trust, believe. Writing the invitation is your time to build that."),
    Q("s6","What do you tell them to bring?","The invitation, to confirm which gift they were offered",["Their hotel key","Only a passport","Nothing"],"Bring the invitation. It confirms the gift."),
    Q("s7","How do you explain what we are?","A full-service hotel. Not timeshare: no weeks, points or fees. We show how to book direct through our club",["A timeshare with great prices","A water sports company","Just a free breakfast, nothing else"],"Be clear: hotel, plus a club for booking direct with preferred rates and perks."),
    LINE("s22","We're not selling timeshare. We don't have any weeks or ___ or maintenance fees.","points",["rooms","rates","nights"],"No weeks, no points, no maintenance fees. A full-service hotel with a club for booking direct."),
    Q("s8","Do guests need to be members to stay at the hotel?","No. It's a full-service hotel, like Hyatt or Hilton. Members just get discounts and perks",["Yes, members only","Only on weekends","Only for all-inclusive"],"No obligation. If the membership isn't for them, we still want them staying at our hotel."),
    Q("s9","How do you ask for a phone number?","Tell them why first: a manager calls 5 to 6 pm only to confirm they're still coming",["Just ask for it","Say we'll send them offers","Skip it"],"Give the why before you ask. They feel like VIPs and don't give a fake number."),
    Q("s13","They answer \"We'll try\" or \"We'll see.\" You…","Ask again: lots of families want to come to our open house promotion, and we don't want to block a space",["Say \"Great, see you!\"","Promise a bigger gift","Let it go"],"Go back and get a real answer."),
    LINE("s14","It's better to get a solid no than a bunch of fake ___.","yeses",["maybes","numbers","bookings"],"Fake yeses don't show up. A solid no lets you find a family who will."),
    Q("s15","Still unsure after you asked again?","Offer to give the invitation to another family",["Write it anyway","Give them two invitations","Take their card"],"\"I wouldn't want to hold a space if you're not sure you're going to make it.\""),
    Q("s17","Your real job is to…","Get people to come to the hotel",["Hand out as many invitations as possible","Talk to everyone on the beach","Collect phone numbers"],"This is a show-up business, not an invitation business."),
    LINE("s18","We only ask families for ___ minutes, and breakfast tends to eat about ___ of that.","90 · half",["45 · all","60 · half","90 · 45 minutes"],"Say 90 minutes. Breakfast eats about half. Never break it into minutes."),
    Q("s19","Why never say \"45 minutes\" or \"30 minutes\"?","They think it's short, then complain when the hostess says 90",["It sounds too long","Hostesses don't like numbers","Breakfast takes longer"],"Never mention minutes. They need to know: 90."),
    Q("s20","Why tell them they'll learn about booking direct with the club?","They come in curious. Surprised guests close their eyes and ears",["It's a legal rule","So they don't come","It makes the tour shorter"],"A real expectation gives them a spark of interest. That means more sales."),
    BUILD("bs1","Book the time","Let me put you down for 8 o'clock.",["maybe","10"],"Start at 8. If it's too early for them, offer 10."),
    BUILD("bs2","Lock in the show-up","So we see you guys tomorrow at 8 for sure?",["maybe","try"],"Reconfirm before they walk away, and take their temperature."),
    LISTEN("ls1","06",9,9,"Listen. When does the manager call?","This afternoon, between 5 and 6",["Tomorrow at 7 am","Right before the tour","Tonight at 9"],"A short confirmation call, only to see if they can still make it."),
    LISTEN("ls2","07",25,25,"Listen. How much is the show-up bonus?","$65",["$20","$100","$200"],"Let them know it matters to you that they show up. They don't have to book or buy anything."),
    LISTEN("ls3","09",4,4,"Listen. What can these tips do for your week?","Go from 8 bookings & 1 show to 10 bookings & 5 or 6 shows",["Double your gift budget","Cut your hours in half","Nothing much"],"Better booking rate, show rate, Q rate. More tours, more sales.")
  ]
},
{
  id: "map", name: "Pitch map", sub: "Put the pitch in order", icon: "route", map: true,
  notes: [] // built from MAP_STEPS
},
{ id: "final", name: "Final run", sub: "Everything, mixed · 25 in a row", icon: "trophy", final: true, count: 25, notes: [] }
];

