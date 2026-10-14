/* Lessons. Writing rules for every item:
   - Situation first, then one clear question. Short, plain words.
   - Answer options match in length and shape, so the right one doesn't stand out.
   - "why" is one or two short sentences with the rule.
   Facts come from the qualifications PDF (2 March 2026), the nine voice notes and the Open House pitch deck. */
const LEVELS = [
{
  id: "q", name: "Full gift (Q)", sub: "Who gets the full gift", icon: "usercheck",
  notes: [
    { h: "USA and Canada: full gift (Q)", li: [
      "Ages 32 to 70. The man's age counts. In a same-sex couple, either partner's age counts.",
      "Married or living together.",
      "Single women: USA only, ages 40 to 65.",
      "One of them works or is retired.",
      "Credit card: Visa, Mastercard, American Express or Discover.",
      "Both fluent in English, or both fluent in Spanish.",
      "Staying at a hotel, timeshare or rental, and paying for it." ] },
    { h: "Latin America and Caribbean: full gift (Q)", li: [
      "Not Aruba, Cuba, Venezuela, Haiti or Ecuador.",
      "Ages 40 to 60. The man's age counts.",
      "Married or living together. No singles.",
      "One of them must work. No retirees.",
      "Credit card: Visa, Mastercard or American Express. No Discover.",
      "Same language and paid-stay rules as above." ] },
    { h: "Argentina: full gift (Q)", li: [ "Ages 45 to 55. The man's age counts." ] },
    { h: "Time they need", li: [
      "The presentation is 90 minutes, breakfast included.",
      "They need 3 free hours that morning, with no paid activities.",
      "Departure day: at least 4 hours before airport pickup, or 5 hours before the flight if they have a rental car." ] }
  ],
  qs: [
    Q("q1","A couple from the USA or Canada. What ages get the full gift (Q)?","32 to 70",["28 to 70","35 to 65","40 to 60"],"USA and Canada: 32 to 70 is Q. 28 to 31 and 71+ get the half gift (CT)."),
    Q("q2","In a couple, whose age counts?","The man's",["The woman's","The older one's","Both, averaged"],"The man's age decides. In a same-sex couple, either partner's age counts."),
    Q("q4","Which single guests can get the full gift?","Women from the USA, 40 to 65",["Men from the USA, 40 to 65","Anyone from Canada, 32 to 70","No single guests at all"],"Only single women, only from the USA, only ages 40 to 65."),
    Q("q5","USA or Canada. What's the work rule?","One of them works or is retired",["Both of them must work","Retired guests can't qualify","Work doesn't matter at all"],"One of them employed or retired is enough."),
    Q("q6","USA or Canada. Which cards work for the full gift?","Visa, Mastercard, Amex or Discover",["Visa or Mastercard, nothing else","Any debit card from their bank","A cash deposit at the hotel"],"Any of those four credit cards. A debit card only works for the half gift (CT)."),
    Q("q7","What's the language rule?","Both fluent in English, or both in Spanish",["One fluent in English is enough","Any language, with a translator","English only, Spanish doesn't count"],"Both must speak the same language fluently: English or Spanish."),
    Q("q8","Where must guests be staying?","A hotel, timeshare or rental they pay for",["Anywhere, even free with friends","Only at an Iberostar hotel","Only at an all-inclusive resort"],"They must be paying for where they stay."),
    Q("q9","How long is the presentation?","90 minutes, breakfast included",["45 minutes, plus breakfast","60 minutes, no breakfast","2 hours, breakfast included"],"90 minutes, and that includes breakfast."),
    Q("q10","How much free time do they need that morning?","3 hours, with no paid activities",["90 minutes, nothing more","2 hours, plans after are fine","Only until breakfast ends"],"The presentation is 90 minutes, but they need 3 free hours with nothing paid booked."),
    Q("q11","It's their departure day. When can they still tour?","4 hours before pickup, 5 before the flight with a rental car",["1 hour before pickup, 2 before the flight with a rental car","Any time before they check out of their hotel","They can't tour at all on departure day"],"At least 4 hours before airport pickup, or 5 hours before the flight if they drive a rental car."),
    Q("q12","A couple from Latin America or the Caribbean. What ages get the full gift?","40 to 60",["32 to 70","45 to 55","35 to 65"],"Latin America and Caribbean: 40 to 60, the man's age."),
    Q("q13","Which countries are NOT covered by the Latin America rules?","Aruba, Cuba, Venezuela, Haiti, Ecuador",["Argentina, Brazil, Chile, Peru, Uruguay","Mexico, Colombia, Peru, Panama, Chile","Costa Rica, Panama, Jamaica, Belize, Bahamas"],"Guests from Aruba, Cuba, Venezuela, Haiti and Ecuador get no gift (NQ)."),
    Q("q14","A couple from Colombia, both 55, both retired. Which gift?","No gift (NQ): one must be working",["Full gift (Q): retired is fine","Half gift (CT): they're retired","Full gift (Q), if they show a Visa"],"Latin America and Caribbean: one of them must work. No retirees."),
    Q("q15","Latin America or Caribbean. Which card does NOT work?","Discover",["Visa","Mastercard","American Express"],"Latin America and Caribbean: Visa, Mastercard or American Express only."),
    Q("q16","A couple from Argentina. What ages get the full gift?","45 to 55",["40 to 60","32 to 70","35 to 70"],"Argentina: 45 to 55, the man's age."),
    MATCH("mq","Match each guest to their full-gift (Q) ages",[["USA or Canada couple","32 to 70"],["Latin America couple","40 to 60"],["Argentinian couple","45 to 55"],["USA single woman","40 to 65"]],"Full gift: USA and Canada 32 to 70, Latin America 40 to 60, Argentina 45 to 55, USA single women 40 to 65.")
  ]
},
{
  id: "ctnq", name: "Half gift and no gift", sub: "CT, NQ and the extra rules", icon: "gift",
  notes: [
    { h: "Half gift (CT): USA and Canada", li: [
      "CT means courtesy tour.",
      "Ages 28 to 31, or 71 and up.",
      "Married or living together. One of them works or is retired.",
      "A debit card is OK, or Visa, Mastercard, American Express or Discover.",
      "Same language and paid-stay rules.",
      "Presentation: at least 60 minutes." ] },
    { h: "Half gift (CT): Argentina", li: [
      "Ages 35 to 44, and 56 to 70 (the man's age).",
      "No singles. No retirees. Visa, Mastercard or American Express.",
      "90-minute presentation with breakfast, and 3 free hours." ] },
    { h: "No gift (NQ)", li: [
      "Anyone who doesn't meet the Q or CT rules, plus:",
      "Travel agents and tour operators.",
      "Commercial airline pilots and crew, like flight attendants.",
      "Active US military: Army, Air Force, Marines, Navy, Coast Guard. National Guard is OK.",
      "People who work for hotel, timeshare or vacation club companies.",
      "Toured Iberostar in-house in the last 6 months, or a street program in the last 12 months.",
      "Three couples or more traveling together (Trinella or Trifecta)." ] },
    { h: "Extra rules", li: [
      "Guests show IDs and a credit card to the hostess.",
      "Biggest party: 6 people, at most 4 adults (18+).",
      "Two qualified couples together (Quinella): 2 invitations, 2 gifts, 1 pay. Sales decides if they tour together.",
      "Paid activities: excursions, spa, pre-arranged transfers, anything prepaid.",
      "Shirts and shoes. No bathing suits.",
      "Iberostar The Club members staying off property: the GI team may invite them. Q if they bring IDs and a card.",
      "Iberostar The Club beneficiaries staying off property: can't be invited. NQ." ] }
  ],
  qs: [
    Q("c1","What does a CT guest get?","The half gift",["The full gift","No gift","Two gifts"],"Q = full gift. CT (courtesy tour) = half gift. NQ (not qualified) = no gift."),
    Q("c2","A couple from the USA or Canada. What ages get the half gift (CT)?","28 to 31, or 71 and up",["25 to 31, or 65 and up","18 to 31, or 70 and up","Only 71 and up"],"USA and Canada: 28 to 31, or 71 and up, get the half gift."),
    Q("c3","USA or Canada, half gift (CT). Which card can they show?","A debit card or a credit card",["Only a credit card, never debit","Only an American Express card","No card at all, just an ID"],"CT is the only group where a debit card is OK."),
    Q("c4","USA or Canada, half gift (CT). What's the shortest presentation?","60 minutes",["30 minutes","45 minutes","90 minutes"],"At least 60 minutes."),
    Q("c5","A couple from Argentina. What ages get the half gift (CT)?","35 to 44, or 56 to 70",["28 to 31, or 71 and up","30 to 44, or 56 and up","40 to 60 only"],"Argentina: 35 to 44 and 56 to 70 get the half gift. 45 to 55 get the full gift."),
    Q("c6","Which job means no gift (NQ)?","Airline pilot or flight attendant",["Nurse or hospital doctor","Police officer or firefighter","School teacher or principal"],"Commercial airline pilots and crew get no gift."),
    Q("c7","Which military guest can still qualify?","National Guard",["Active Army","Active Navy","Active Coast Guard"],"Active US military gets no gift. The National Guard is OK."),
    Q("c8","Which guest gets no gift (NQ)?","A travel agent on vacation",["A nurse on vacation","A retired teacher","A National Guard member"],"Travel agents, tour operators, and people who work for hotels, timeshares or vacation clubs get no gift."),
    Q("c12","Three couples traveling together. Which gift?","No gift (NQ)",["Three full gifts","One shared gift","Three half gifts"],"Three couples or more together (Trinella or Trifecta) get no gift."),
    Q("c13","Two qualified couples traveling together (Quinella). What do they get?","2 invitations, 2 gifts, 1 pay",["1 invitation, 1 gift, 1 pay","2 invitations, 1 gift, 2 pays","No gift: groups can't tour"],"Quinella: 2 invitations, 2 gifts, 1 pay. Sales decides if they tour together."),
    Q("c15","What do guests show the hostess?","Their IDs and a credit card",["Their hotel key card and receipt","Their flight tickets home","Only the invitation, nothing else"],"IDs and a credit card at check-in."),
    Q("c16","Which one counts as a paid activity?","A prepaid airport transfer",["A walk on Eagle Beach","A swim in their hotel pool","Breakfast at their hotel"],"Excursions, spa, pre-arranged transfers or anything prepaid."),
    Q("c17","What's the dress code for the tour?","Shirts and shoes, no bathing suits",["Anything goes, they're on vacation","Business casual, jackets for men","Swimwear is fine with a cover-up"],"Shirts and shoes required. No bathing suits."),
    Q("c18","An Iberostar The Club member is staying off property. Can they come?","Yes: the GI team can invite them, as Q",["No: members always get no gift","Yes, but only with a half gift","No: members never take the tour"],"The GI team may invite them. They're Q if they bring IDs and a card."),
    Q("c19","An Iberostar The Club beneficiary is staying off property. Can they come?","No: they can't be invited (NQ)",["Yes, as Q with IDs and a card","Yes, with a half gift (CT)","Yes, if they're 40 to 60"],"Beneficiaries staying off property can't be invited."),
    MATCH("mc","Match each rule to its number",[["Wait after an in-house tour","6 months"],["Wait after a street tour","12 months"],["Most people in one party","6"],["Most adults in one party","4"]],"An in-house tour in the last 6 months, or a street program in the last 12, means no gift. A party is at most 6 people and 4 adults.")
  ]
},
{
  id: "who", name: "Who qualifies?", sub: "Real couples: Q, CT or NQ", icon: "couple",
  gen: true, count: 12,
  notes: [
    { h: "Check a couple in this order", li: [
      "Where are they from? USA and Canada, Argentina, Latin America and Caribbean, or a country that's left out.",
      "How old is the man? Which age band is that?",
      "Are they a couple? Singles: only USA women, 40 to 65.",
      "Do they work? Retired is OK for USA and Canada only.",
      "Which card? Discover is USA and Canada only. Debit only works for the half gift.",
      "Same language, paying for their stay, 3 free hours.",
      "Any reason for no gift? Their job, the military, a recent tour, 3 or more couples." ] },
    { h: "Age bands (the man's age)", li: [
      "USA and Canada: under 28 NQ, 28 to 31 CT, 32 to 70 Q, 71+ CT.",
      "Latin America and Caribbean: 40 to 60 Q, any other age NQ.",
      "Argentina: 35 to 44 CT, 45 to 55 Q, 56 to 70 CT, any other age NQ.",
      "Aruba, Cuba, Venezuela, Haiti, Ecuador: NQ at any age." ] }
  ]
},
{
  id: "why", name: "Remove the doubt", sub: "Say why first, then the good news", icon: "chat", script: [0, 1, 2],
  notes: [
    { h: "Crawl, walk, run", li: [
      "Crawl: you can stop people.",
      "Walk: you can write invitations.",
      "Run: you make solid bookings that show up." ] },
    { h: "Say why before how", li: [
      "Guests doubt three things: that it's a scam, that it's timeshare, or that you're selling water sports and activities.",
      "Open with \"free breakfast and a gift\" and they think: it's a scam, it's not true, or it's timeshare. They walk away.",
      "Tell them why you're inviting them first. Then what they get makes sense." ],
      say: "Yes folks, I'm part of the team inviting families to come see the newest hotel on the island. Once you've seen it, next time you travel you'll want to stay with us. It also helps us spread the word: you tell family and friends, maybe post a picture on Facebook or Instagram." },
    { h: "Then the good news, in this order", li: [
      "It's a full branding experience, not just a quick look at the hotel.",
      "Breakfast at one of our five-star restaurants.",
      "A personal tour of the property: the facilities and the service.",
      "See one of our rooms.",
      "A thank-you for their time: IberoCash for the best restaurants, activities and shopping on the island.",
      "The pitch deck adds one more: their taxi is on us, both ways." ] },
    { h: "Make it personal", li: [
      "See a Riu bracelet? \"You're probably eating breakfast at the same place every day. This is something new and different.\"",
      "We partner with the best (Gianni's, Screaming Eagle, Daniel's) because everybody wants to be linked to Iberostar.",
      "We've invested in Aruba: the Tierra del Sol golf course and community, our first hotel, and two more coming." ] },
    { h: "Offer the invitation", li: [
      "Say \"Let me get you an invitation.\" Don't ask \"Would you like one?\"",
      "They either let you keep going, or they tell you their objections now.",
      "Already own timeshare, don't want to commit, plans tomorrow: all of these can be worked.",
      "The only one you really can't work: they leave tomorrow morning." ] }
  ],
  qs: [
    Q("w1","Crawl, walk, run. What does \"run\" mean?","Making solid bookings",["Stopping people","Writing invitations","Handing out flyers"],"Crawl: stop people. Walk: write invitations. Run: solid bookings that show up."),
    Q("w19","Which three doubts do you remove first?","A scam, timeshare, or selling activities",["The price, the distance, the weather","The breakfast, parking, dress code","Their language, their ID, their card"],"Guests worry it's a scam, timeshare, or an activities booth. Remove those doubts first."),
    Q("w2","You open with \"Free breakfast and a gift!\" What do guests think?","It's a scam, not true, or timeshare",["Great, where do we sign up?","They want a bigger gift","They need more details first"],"Leading with the gift creates doubt. Lead with why."),
    LINE("w16","If you tell them ___ first, it removes the doubt.","why",["the gift","the price","the time"],"Why before how. Once they know why you stopped them, the offer makes sense."),
    Q("w4","Which opener says why first?","\"We're inviting families to see the newest hotel on the island.\"",["\"Do you guys want a free breakfast and a gift today?\"","\"Hey folks, have you been to Eagle Beach yet today?\"","\"Quick question, do you two own a timeshare at home?\""],"Why first: we want them to see the hotel, love it, and stay with us."),
    Q("w5","Besides wanting them to stay with us, why do we invite them?","So they tell family and friends about it",["So we can sell them excursions","So the restaurant looks full","So we can collect their emails"],"Guests who see it tell people and post pictures. That's good marketing."),
    LINE("w20","We're inviting families for a full ___ experience, not just a quick look at the hotel.","branding",["sales","spa","dining"],"A full branding experience: breakfast, a personal tour, a room, and a thank-you for their time."),
    Q("w6","In what order do you share the good news?","Breakfast, tour, room, then the gift",["Gift, breakfast, room, then the tour","Room, gift, breakfast, then the tour","Tour, gift, room, then the breakfast"],"Breakfast, a personal tour, a room, and the gift last, as a thank-you."),
    Q("w7","The guest wears a Riu bracelet. What do you say?","\"Same breakfast every day? This is something new.\"",["\"Riu isn't as nice as our hotel, you know.\"","\"Sorry, guests from Riu can't come with us.\"","Nothing. Where they stay doesn't matter."],"Use what you see to make it personal: something new, something different."),
    LINE("w18","The best part is, we also ___ you for your time, as a way of saying thanks.","reward",["pay","charge","upgrade"],"The gift is a thank-you for their time, and it comes last."),
    Q("w10","What shows guests we've invested in Aruba?","Tierra del Sol, our first hotel, two more coming",["The cruise terminal and the airport","A casino and two nightclubs downtown","A water park and the new mall"],"We own the Tierra del Sol golf course and community, opened our first hotel, and have two more coming."),
    Q("w12","Why say \"Let me get you an invitation\" instead of asking?","It brings out their objections now",["It's shorter and easier to say","It sounds more polite to guests","Guests can't say no to it"],"They either let you keep going, or tell you their objections now, so you can work them."),
    Q("w13","\"We already own a timeshare.\" What is that?","An objection you can work with",["A reason to let them go","An automatic no gift (NQ)","A problem only for USA guests"],"Owning a timeshare can be worked. See the NLP unit for how."),
    BUILD("bw1","How do you offer the invitation?","Let me get you an invitation.",["Would","like"],"Don't ask if they want one. Say it: Let me get you an invitation."),
    LISTEN("lw1","02",7,9,"Listen to this opener. What's wrong with it?","It leads with the gift",["It's much too long","It forgets the breakfast","It names the wrong beach"],"Free breakfast and $200 up front sounds like a scam, not true, or timeshare. Lead with why."),
    LISTEN("lw2","04",10,10,"Listen. Which objection can't you work?","They're leaving tomorrow morning",["They already own a timeshare","They don't want to commit","They have plans tomorrow"],"Every other objection is a chance to turn it around.")
  ]
},
{
  id: "offer", name: "The Open House offer", sub: "The pitch deck, the gifts, the partners", icon: "ticket", video: "video/golf-loop.mp4", poster: "video/golf-loop.jpg",
  imgs: [
    { src: "img/deck-open-house.jpg", w: 1600, h: 900, cap: "The Open House pitch deck",
      alt: "Open House Promotion pitch deck slide: Five Star Breakfast, VIP Property Tour, Island Gift of IberoCash, complimentary taxi. No timeshare, no high pressure, no obligation, short and sweet." },
    { src: "img/deck-partners.jpg", w: 1364, h: 768, cap: "Pitch deck: our partners, our commitment and what to bring",
      alt: "Pitch deck slide with 16 partner logos, plus Our Commitment and What to Bring." }
  ],
  notes: [
    { h: "The offer, in the pitch deck's words", li: [
      "Five Star Breakfast: the hostesses check them in at the Main Lobby, then it's off to a free breakfast at one of our restaurants.",
      "VIP Property Tour: a preview of the VIP features of the resort and suites, so they see what awaits their family when they choose Iberostar.",
      "Island Gift: to thank them for their time, a choice of IberoCash to use with Aruba's top merchants. Dining, shopping, activities, rentals.",
      "Free taxi: they arrange the taxi themselves. We pay the fare when they arrive, and again when they leave." ] },
    { h: "Four promises", li: [
      "No timeshare.", "No high pressure.", "No obligation.",
      "Short and sweet: 90 minutes, including the breakfast, the property tour and information on booking direct." ] },
    { h: "Where and why", li: [
      "The Joia by Iberostar Resort, in the heart of Aruba's famous Eagle Beach.",
      "To tempt them to stay with us in the future, and to introduce Iberostar The Club, the newest and most luxurious way to travel." ] },
    { h: "Our commitment", li: [
      "We don't sell timeshare: no weeks, points or maintenance fees.",
      "A full-service resort brand they can book through travel agents or online. We show how our members book direct at wholesale rates through our loyalty club.",
      "No high pressure and no obligation to book or buy." ] },
    { h: "What to bring", li: [
      "Their invitation, so they get everything they were promised.",
      "Every adult: 2 forms of ID, like a driver's license or passport, and a credit card." ] },
    { h: "Our partners", li: [
      "At Joia: Marea, Bucatini, Gaia and the Zima rooftop bar.",
      "Dining around the island: Gianni's, Daniel's Steak & Chop, Azzurro, Azia, Amore Mio, Screaming Eagle, Dushi Bagels & Burgers, and The Birdie at Tierra del Sol.",
      "Golf: Tierra del Sol. Tours: Rocka Beach Tours. Shopping: Aruba Aloe. Car rental: Elixir Car Rental." ] }
  ],
  qs: [
    Q("o1","What's the promotion called?","Our Open House Promotion",["The Timeshare Preview","The VIP Sales Event","The Beach Breakfast Club"],"The pitch deck and the voice notes both call it the Open House Promotion."),
    Q("o3","Which four promises are in the pitch deck?","No timeshare, no pressure, no obligation, short and sweet",["Free stay, free flight, free spa, free golf","Members only, book today, pay later, cash only","No ID, no card, no breakfast, no tour"],"No timeshare. No high pressure. No obligation. Short and sweet."),
    Q("o4","Where does the morning start?","In the Main Lobby, with the hostesses",["At the beach bar by the pool","At an office in Oranjestad","At the golf course clubhouse"],"The hostesses check them in at the Main Lobby, then it's off to breakfast."),
    Q("o5","How does the free taxi work?","They take a taxi, and we pay both ways",["We send a shuttle to their hotel","We pay for the ride there only","Only Iberostar guests get a taxi"],"They arrange the taxi. We pay the fare when they arrive and again when they leave."),
    Q("o7","What is the Island Gift?","IberoCash for Aruba's top places",["A free night at the Joia hotel","Cash handed out at the front desk","A discount on a timeshare week"],"A thank-you for their time, to use for dining, shopping, activities and rentals."),
    Q("o8","Where can guests use IberoCash?","Dining, shopping, activities, rentals",["Flights, hotels, cruises, trains","Groceries, gas, pharmacy, phone bills","Casino, lottery, bets, ATM cash"],"The pitch deck lists dining, shopping, activities and rentals."),
    Q("o14","What does every adult bring?","2 forms of ID and a credit card",["Only the invitation, nothing more","Their hotel key card and receipt","One ID for the whole couple"],"Two IDs, like a driver's license or passport, and a credit card. Plus the invitation."),
    LINE("o15","Members book direct at ___ rates through our loyalty club.","wholesale",["retail","timeshare","weekly"],"Members book direct at wholesale rates. We don't sell timeshare: no weeks, points or maintenance fees."),
    LINE("o16","We ask for 90 minutes, including breakfast, the tour and information on ___.","booking direct",["buying a week","points and fees","the casino"],"Short and sweet: 90 minutes, including the breakfast, the property tour and information on booking direct."),
    Q("o18","How does the pitch deck describe Iberostar The Club?","The newest, most luxurious way to travel",["A timeshare with weeks and points","A members-only resort in Aruba","A cruise line's travel club"],"The pitch deck calls Iberostar The Club the newest and most luxurious way to travel."),
    PIC("pj","img/photos/joia-beach.jpg","The Joia by Iberostar resort on its beach","Where do guests go for the Open House?","The Joia by Iberostar, on Eagle Beach",["A sales office in downtown Oranjestad","A partner resort on Palm Beach","The clubhouse at Tierra del Sol"],"The Joia by Iberostar Resort, in the heart of Eagle Beach."),
    PIC("ps","img/photos/joia-suite.jpg","A Joia suite living room","What do guests see on the VIP Property Tour?","The resort's VIP features and suites",["A timeshare sales office and contracts","The airport's VIP lounge","Model homes for sale nearby"],"So they see what awaits their family when they choose Iberostar."),
    PIC("pm","img/photos/marea.jpg","A dish at Marea","What is Marea?","A restaurant at Joia",["A car rental partner","A golf course","A tour company"],"Marea, Bucatini, Gaia and the Zima rooftop bar are all at Joia."),
    PIC("pg","img/photos/golf.jpg","The Tierra del Sol golf course","What is Tierra del Sol?","Iberostar's golf course and community",["A beach club on Palm Beach","A car rental company downtown","The island's cruise ship terminal"],"We own the Tierra del Sol golf course and community. The Birdie is its restaurant."),
    PIC("pr","img/photos/rocka.jpg","A Rocka Beach Tours jeep","What does Rocka Beach Tours offer?","Off-road tours, karting and sailing",["Car rentals and taxis only","Fine dining at the beach","Spa and massage treatments"],"Rocka Beach Tours is our tours partner."),
    MATCH("mo","Match each partner to what it is",[["Elixir","Car rental"],["Rocka Beach","Tours"],["Aruba Aloe","Shopping"],["Tierra del Sol","Golf"],["Zima","Rooftop bar at Joia"]],"Elixir rents cars, Rocka Beach runs tours, Aruba Aloe is shopping, Tierra del Sol is golf, Zima is the rooftop bar at Joia.")
  ]
},
{
  id: "solid", name: "Make it solid", sub: "From booking to show-up", icon: "calendar", script: [3, 4, 5, 6],
  notes: [
    { h: "Book the time", li: [
      "Say \"Let me put you down for 8 o'clock.\"",
      "If 8 is too early, offer 10. If they don't say it's too early, you have an easy booking." ] },
    { h: "Slow down while you write", li: [
      "While you write, they stay. About 1 family in 100 walks away during the invitation. It's manners.",
      "Keep making a friend. Ask small questions about them. If they like you, trust you and believe you, they buy from you." ] },
    { h: "Phone number: say why", li: [
      "A manager or supervisor calls this afternoon, around 5 to 6, only to check they can still make it. WhatsApp works.",
      "Said this way, they feel like VIPs and don't give a fake number." ],
      say: "Folks, we also do confirmation calls. If you give me your phone number, maybe you have WhatsApp, one of my managers can reach out this afternoon between 5 and 6, simply to ask if you're still able to make it. We're not allowed to solicit or anything like that." },
    { h: "Say what it really is", li: [
      "\"Bring this invitation with you to confirm which gift you were offered.\"",
      "Breakfast, a quick tour, and we show how to book direct through our loyalty club.",
      "We're not timeshare: no weeks, no points, no maintenance fees. A full-service hotel you can book through travel agents or Expedia.",
      "No one has to be a member to stay with us. Members get discounts and great perks.",
      "Guests who know what's coming arrive curious. Surprised guests close their eyes and ears." ] },
    { h: "Talk about time the right way", li: [
      "\"We only ask families for 90 minutes, and breakfast tends to eat about half of that.\"",
      "Never say 45 or 30 minutes, and never break it into minutes. When the hostess says 90, they feel misled." ] },
    { h: "Lock it in before they walk", li: [
      "Don't just say \"have a nice day.\" Ask: \"So we see you guys tomorrow at 8 for sure?\"",
      "They say \"we'll try\" or \"we'll see\"? Ask again: lots of families want to come, and we don't want to hold a space.",
      "Still unsure? Offer the invitation to another family. A solid no beats a fake yes.",
      "You can tell them: \"I get a $65 bonus just for you showing up. You don't have to book or buy anything.\"",
      "Your job isn't handing out invitations. It's getting people to the hotel." ] }
  ],
  qs: [
    Q("s3","What should you do while you write the invitation?","Slow down and keep making a friend",["Hurry before they change their mind","Stay quiet and just write","Let them fill it in themselves"],"This is the best time to build the bond."),
    Q("s4","Why is it safe to slow down while you write?","Only about 1 family in 100 walks away",["They already signed something","The gift is already promised","A manager is watching them"],"Once you're writing, they stay. It's manners."),
    Q("s7","How do you explain what we are?","A full-service hotel with a club for booking direct",["A timeshare with great prices and weeks","A water sports and excursions company","Just a free breakfast, nothing else"],"A hotel like Hyatt or Hilton, plus a club to book direct with preferred rates and perks."),
    Q("s8","Do guests have to be members to stay at the hotel?","No, it's a hotel like Hyatt or Hilton",["Yes, the hotel is members only","Only on weekends and holidays","Only for all-inclusive stays"],"No obligation. Members just get discounts and perks."),
    Q("s9","How do you ask for their phone number?","Say why first: a short call between 5 and 6",["Just ask for it and keep writing","Say we'll send them special offers","Skip it, it scares people off"],"Give the reason first. They feel like VIPs and don't give a fake number."),
    Q("s13","They say \"We'll try\" or \"We'll see.\" What do you do?","Ask again: other families want this spot",["Say \"Great, see you tomorrow!\" and go","Promise them a bigger gift to come","Let it go and wish them a nice day"],"Go back and get a real answer. Lots of families want to come."),
    LINE("s14","It's better to get a solid no than a bunch of fake ___.","yeses",["maybes","numbers","bookings"],"Fake yeses don't show up. A solid no frees you to find a family who will."),
    Q("s15","They're still unsure after you asked again. Now what?","Offer the invitation to another family",["Write it for them anyway and hope","Give them two invitations, just in case","Ask for their credit card to hold it"],"\"I wouldn't want to hold a space if you're not sure you can make it.\""),
    Q("s17","What is your real job?","Getting people to the hotel",["Handing out invitations","Talking to everyone you see","Collecting phone numbers"],"This is a show-up business, not an invitation business."),
    LINE("s18","We only ask families for ___ minutes, and breakfast tends to eat about half of that.","90",["45","60","30"],"Say 90 minutes. Breakfast eats about half. Never break it into minutes."),
    Q("s19","Why never say \"45 minutes\"?","They feel misled when the hostess says 90",["It sounds too long to guests","The hostesses don't like numbers","Breakfast takes even longer"],"Never mention minutes. All they need to know is 90."),
    Q("s20","Why tell them they'll hear about booking direct with the club?","So they arrive curious, not surprised",["It's a legal rule for the tour","So fewer families show up","It makes the tour shorter"],"Guests who know what's coming are open to it. Surprised guests close their eyes and ears."),
    BUILD("bs1","How do you book the time?","Let me put you down for 8 o'clock.",["maybe","10"],"Start with 8. If it's too early for them, offer 10."),
    BUILD("bs2","How do you lock in the show-up?","So we see you guys tomorrow at 8 for sure?",["maybe","try"],"Ask again before they walk away, and watch how they answer."),
    LISTEN("ls1","06",9,9,"Listen. When does the manager call?","This afternoon, between 5 and 6",["Tomorrow at 7 in the morning","Right before the tour starts","Tonight at 9 at their hotel"],"A short call, only to see if they can still make it."),
    LISTEN("ls2","07",25,25,"Listen. How much is the show-up bonus?","$65",["$20","$100","$200"],"Let them know it matters to you. They don't have to book or buy anything.")
  ]
},
{
  id: "words", name: "Word for word", sub: "The exact lines from the voice notes", icon: "mic", script: [0, 1, 2, 3, 4, 5, 6],
  notes: [
    { h: "How this level works", li: [
      "Each question is a real line from the voice notes with one key word missing.",
      "Pick the word, then tap Hear the line to hear it said.",
      "Say the whole line out loud once. Saying it is what makes it yours." ] }
  ],
  qs: [
    LINE("k1","\"I'm part of the exciting team that's inviting families to the newest ___ on the island.\"","hotel",["timeshare","golf course","restaurant"],"Say why first: we want families to come see the newest hotel on the island.",["02",12,12]),
    LINE("k2","\"Once you've seen it, hopefully next time you ___, you'll want to stay with us.\"","travel",["retire","book a cruise","buy a home"],"The why: see it, love it, stay with us next time you travel.",["02",13,13]),
    LINE("k3","\"And it also helps us spread the ___.\"","word",["news","flyers","love"],"Guests who see the hotel tell family and friends. That's good marketing.",["02",22,22]),
    LINE("k4","\"When you arrive, we treat you to breakfast at one of our ___ restaurants.\"","five-star",["beachside","partner","all-inclusive"],"Breakfast at one of our five-star restaurants comes first in the good news.",["03",3,3]),
    LINE("k5","\"After breakfast, they're going to give you a ___ tour of the property.\"","personalized",["sales","group","golf"],"A personalized tour, so they see the facilities and the service for themselves.",["03",9,9]),
    LINE("k6","\"So you'll be able to ___ the quality that you'll receive when you stay with us.\"","anticipate",["pay for","rate","rent"],"Seeing a room lets them picture their future stay.",["03",10,10]),
    LINE("k7","\"Everybody wants to be ___ with Iberostar.\"","associated",["partners","working","staying"],"That's why the best companies on the island partner with us.",["03",15,15]),
    LINE("k8","\"Let me get you an ___.\"","invitation",["upgrade","appointment","offer"],"Say it. Don't ask if they'd like one.",["04",1,1]),
    LINE("k9","\"Let me put you down for ___ o'clock.\"","8",["7","9","11"],"Start with 8. If it's too early for them, offer 10.",["05",0,0]),
    LINE("k10","\"Make sure to bring this invitation with you to confirm which ___ you are offered.\"","gift",["room","time","tour"],"The invitation confirms their gift.",["05",15,15]),
    LINE("k11","\"We don't have any weeks or points or ___ fees.\"","maintenance",["booking","cleaning","resort"],"We're not selling timeshare: no weeks, no points, no maintenance fees.",["05",17,17]),
    LINE("k12","\"One of my managers… can reach out to you this afternoon… simply to ask you if you're still able to ___ it.\"","make",["miss","book","sell"],"The call is only to check they can still make it.",["06",9,9]),
    LINE("k13","\"Sorry if I ___, but I thought you were pretty sure you were coming.\"","misunderstood",["was rude","bothered you","rushed you"],"Calm and honest. It brings out the real answer.",["07",4,4]),
    LINE("k14","\"We certainly wouldn't want to ___ a space for someone who's sure they want to come.\"","block",["sell","waste","clean"],"Lots of families want to come. A space shouldn't go to a maybe.",["07",9,9]),
    LINE("k15","\"You know what, guys, maybe I should give this invitation to ___.\"","somebody else",["the manager","your kids","the hostess"],"Still unsure after you asked again? Offer it to another family.",["07",15,15]),
    LINE("k16","\"This nice young man gets a little $65 bonus on his paycheck just for you ___.\"","showing up",["buying","booking","signing up"],"They don't have to book or buy anything. Showing up is enough.",["07",25,25])
  ]
},
{
  id: "map", name: "Pitch map", sub: "Put the pitch in order", icon: "route", map: true,
  notes: [] // built from MAP_STEPS
},
{
  id: "nlp1", name: "Rapport", sub: "Match, mirror, make a friend", icon: "smile",
  notes: [
    { h: "What NLP is", li: [
      "NLP (neuro-linguistic programming) is a set of habits for talking with people: how you match them, the words you choose, and how you read their reactions.",
      "Use it so guests feel understood and decide for real. Never to trick or pressure anyone: our pitch deck promises no high pressure and no obligation." ] },
    { h: "Rapport comes first", li: [
      "People say yes to people they like and trust.",
      "The voice notes put it simply: if they like you, trust you and believe you, they will buy from you." ],
      hear: { clip: "05", from: 13, to: 13 } },
    { h: "Match and mirror", li: [
      "Match their energy: excited couple, bring energy. Quiet couple, lower your voice and slow down.",
      "Mirror their posture, softly and a moment later. If they relax and lean back, relax too. Don't copy every move.",
      "Match their pace: in a hurry, keep it short. Taking it easy, take your time." ] },
    { h: "Use their words", li: [
      "Repeat the words they use. They say \"relax\", you say \"relax\". They say \"the kids\", you say \"the kids\".",
      "Repeat key details back, and use their names once you know them." ],
      say: "Ohio! How's your first week in Aruba going?", sayId: "n1a" },
    { h: "Make a friend while you write", li: [
      "Ask easy, open questions and really listen: where they're from, first time in Aruba, what they've liked so far.",
      "Talk less than they do. Smile. Nod." ],
      say: "Where are you guys from? First time in Aruba?", sayId: "n1b",
      hear: { clip: "05", from: 10, to: 12 } },
    { h: "Check that it's working", li: [
      "Rapport: they smile, lean in, ask questions and tell you things.",
      "Not yet: short answers, arms crossed, looking away. Slow down, match them, ask something easy." ] }
  ],
  qs: [
    Q("n1","What is NLP?","Habits for matching, wording and reading people",["A script you read word for word","A list of the free gifts we offer","A rule from the qualifications PDF"],"Neuro-linguistic programming: match people, choose your words, read their reactions."),
    Q("n2","When is it wrong to use NLP?","To trick or pressure a guest",["To match a guest's mood","To give a clear choice","To make a guest feel heard"],"Use it so people decide for real. The pitch deck promises no high pressure and no obligation."),
    LISTEN("n3","05",13,13,"Listen. When do guests buy from you?","When they like, trust and believe you",["When the gift is big enough","When you talk fast enough","When you show them the price"],"Rapport first: like, trust, believe."),
    Q("n4","A couple talks slowly and quietly. How do you talk?","Slower and quieter, like them",["Faster, to bring the energy","Louder, so they hear you","The same as with everyone"],"Match their pace and volume. People relax with people like them."),
    Q("n5","What is mirroring?","Matching their posture, softly and a bit later",["Copying every move they make, right away","Repeating every word they say, exactly","Standing very close and staring at them"],"Soft and a little later. Copying every move feels strange."),
    Q("n6","The guest says: \"We just want to relax this trip.\" Which reply uses their words?","\"Then you'll love it: a relaxed breakfast, no rush.\"",["\"Then you need our jeep tour, it's a blast!\"","\"OK, but first listen to this offer, folks.\"","\"Relaxing gets boring after a day, trust me.\""],"Use their word back: relax. It shows you listened."),
    Q("n7","Which question builds rapport while you write?","\"First time in Aruba?\"",["\"Can you sign right here?\"","\"How much do you earn?\"","\"What's your room number?\""],"Easy, open, friendly. Ask, then listen."),
    Q("n8","Which sign shows you have rapport?","They smile, lean in and ask questions",["They keep checking their phones","They answer in one word","They keep walking slowly"],"Watch for it. No rapport yet? Slow down and match them."),
    Q("n9","Short answers, arms crossed, looking away. What do you do?","Slow down, match them, ask something easy",["Talk faster so they don't walk away","Go straight to the gift and the cash","Hand them the invitation right now"],"Build rapport first. Then lead."),
    Q("n10","Why repeat details back, like \"Ohio! How's the trip?\"","It shows you listened, so they open up",["It fills the silence while you write","It tests their memory a little","It makes the talk last longer"],"Repeating their words is one of the fastest ways to build rapport."),
    MATCH("n11","Match the couple to how you talk",[["Excited couple","Bring your energy up"],["Quiet couple","Lower your voice"],["Couple in a hurry","Keep it short"],["Curious couple","Answer, then ask back"]],"Match them first. Then lead."),
    BUILD("n12","Ask a friendly question while you write.","Where are you guys from?",["sign","card"],"Open questions make a friend. Ask, then listen.")
  ]
},
{
  id: "nlp2", name: "Words that lead", sub: "Assume the yes, two choices, say because", icon: "quote",
  notes: [
    { h: "Assume the yes (presupposition)", li: [
      "Use words that take the yes for granted.",
      "Say \"Let me get you an invitation\", not \"Would you like one?\"",
      "Say \"When you come tomorrow\", not \"If you come\"." ],
      hear: { clip: "04", from: 1, to: 1 },
      say: "When you come to breakfast tomorrow, bring this invitation.", sayId: "n2a" },
    { h: "Give a choice of two yeses", li: [
      "Offer two good options. Either answer is a yes. NLP calls it a double bind.",
      "The voice notes do it: put them down for 8, and if that's too early, offer 10." ],
      hear: { clip: "05", from: 0, to: 1 },
      say: "Is 8 or 10 o'clock better for you guys?", sayId: "n2b" },
    { h: "Say because", li: [
      "A reason makes a request feel fair, so more people say yes.",
      "Give the reason when you ask: \"We do confirmation calls, so can I get your number?\"" ],
      hear: { clip: "06", from: 6, to: 6 } },
    { h: "Tag questions", li: [
      "End with a small question that invites a yes: \"right?\", \"for sure?\"",
      "\"You guys love a good breakfast, right?\" \"So we see you tomorrow at 8 for sure?\"" ],
      hear: { clip: "07", from: 1, to: 1 } },
    { h: "Small words that matter", li: [
      "Say \"and\", not \"but\". \"But\" cancels what came before it.",
      "Drop \"try\" and \"maybe\". They sound unsure.",
      "Embedded command: put the action you want inside a normal sentence, and say it a little slower: \"When you come see the hotel tomorrow...\"" ] }
  ],
  qs: [
    Q("n13","\"Let me get you an invitation.\" Which NLP move is that?","Assuming the yes (presupposition)",["Asking for a yes (tag question)","Changing the meaning (reframe)","Copying the guest (mirroring)"],"It takes the yes for granted, so doubts come out now."),
    Q("n14","Which line assumes they're coming?","\"When you come tomorrow, ask for Marea.\"",["\"If you want, maybe you could come.\"","\"Would you be interested in a tour?\"","\"Do you guys even like breakfast?\""],"\"When\" assumes it's happening. \"If\" and \"would\" invite a no."),
    LISTEN("n15","05",0,1,"Listen. Why offer 8, then 10?","Either answer books them",["It shows the hotel is busy","It tests if they're awake","It makes the talk longer"],"A choice of two yeses. NLP calls it a double bind."),
    Q("n16","Which question offers two yeses?","\"Is 8 or 10 better for you guys?\"",["\"Do you want to come or not?\"","\"Are you free at all tomorrow?\"","\"Could you maybe come by later?\""],"Both answers book them."),
    LINE("n17","Can I get your number, ___ we do confirmation calls this afternoon?","because",["unless","although","before"],"A reason makes the request feel fair."),
    Q("n18","Why does saying \"because\" work?","A reason makes the request feel fair",["It makes the line longer and slower","It sounds more formal and official","Guests like hearing long words"],"Give the reason and more people say yes. The voice notes: say why when you ask."),
    Q("n19","Which line is a tag question?","\"You guys love a good breakfast, right?\"",["\"What do you eat for breakfast, guys?\"","\"Breakfast starts at 8 in the morning.\"","\"Do you guys even like breakfast?\""],"A small \"right?\" at the end invites a yes."),
    Q("n20","\"It's 90 minutes, but breakfast eats about half.\" Which word should replace \"but\"?","and",["or","so","except"],"\"But\" cancels what came before. \"And\" keeps both parts."),
    Q("n22","What is an embedded command?","The action you want, inside a sentence",["A direct order you give the guest","The fine print on the invitation","A secret code word for the hostess"],"\"When you come see the hotel tomorrow...\" Say the action a little slower."),
    LISTEN("n25","07",1,1,"Listen. What does \"for sure?\" at the end ask for?","A clear yes that they'll come",["Their phone number and name","Bringing a bigger group along","Moving to a later time"],"A tag question asks for commitment. Then watch how they answer."),
    MATCH("n23","Match each move to its line",[["Assume the yes","\"When you come tomorrow...\""],["Two yeses","\"8 or 10 o'clock?\""],["Because","\"...because we do confirmation calls\""],["Tag question","\"...great breakfast, right?\""]],"Four word moves that lead to a real yes."),
    BUILD("n24","Offer two times.","Is 8 or 10 better for you guys?",["maybe","if"],"Two yeses: either answer books them.")
  ]
},
{
  id: "nlp3", name: "Pace and lead", sub: "Agree first, picture it, then lead", icon: "steps",
  notes: [
    { h: "Pace, then lead", li: [
      "Pace: say two or three things that are true for them right now. Each one is a small yes.",
      "Lead: then take them to the next step." ],
      say: "Beautiful day on Eagle Beach, right? Let me get you an invitation.", sayId: "n3a" },
    { h: "The voice notes do it", li: [
      "\"I see you have a bracelet from Riu. I'm sure you're eating breakfast at the same place every day.\" That's pacing.",
      "\"You're going to love our place. It's something new, something different for you.\" That's leading." ],
      hear: { clip: "03", from: 5, to: 8 } },
    { h: "Help them picture it (future pacing)", li: [
      "Help them see the good moment that's coming: the breakfast, the ocean, the room.",
      "The voice notes: they see one of our rooms \"so you'll be able to anticipate the quality you'll receive when you stay with us.\"" ],
      hear: { clip: "03", from: 10, to: 10 },
      say: "Picture the two of you tomorrow, breakfast by the ocean at Joia.", sayId: "n3b" },
    { h: "Anchor the good moment", li: [
      "When they laugh or get excited, that's the moment to hand over the invitation or say the time.",
      "The good feeling gets linked to the hotel." ] },
    { h: "Simple, never false", li: [
      "\"We only ask families for 90 minutes, and breakfast tends to eat about half of that.\" It's true, and it doesn't break it into minutes.",
      "Never trade the truth for a yes." ],
      hear: { clip: "08", from: 2, to: 3 } }
  ],
  qs: [
    Q("n26","What is pacing?","Saying things that are true for them now",["Walking at the guest's speed","Talking fast to hold attention","Counting the minutes of the pitch"],"Small truths they agree with. Then you lead."),
    Q("n27","What is leading?","Taking them to the next step",["Walking in front of them","Talking more than they do","Picking the gift for them"],"Pace first, then lead."),
    LISTEN("n28","03",5,8,"Listen. What does the Riu bracelet line do?","Paces their routine, then leads to our hotel",["Says Riu is a worse hotel than ours","Asks them for their room number","Checks if they qualify for a gift"],"Same breakfast every day (pace). Something new at our place (lead)."),
    Q("n29","A couple on Eagle Beach. Which is a pacing line?","\"Beautiful day on Eagle Beach, right?\"",["\"Let me get you an invitation, folks.\"","\"Do you two own a timeshare at home?\"","\"Is 8 or 10 better for you guys?\""],"True for them right now, and easy to agree with."),
    Q("n30","How many easy yeses before you lead?","Two or three",["None at all","Ten or more","Just one, the invitation"],"A few small yeses make the next yes easier."),
    Q("n31","What is future pacing?","Helping them picture what's coming",["Booking them for next year","Talking about the price later","Walking ahead of them"],"\"Picture the two of you tomorrow, breakfast by the ocean.\""),
    Q("n32","Which line helps them picture tomorrow?","\"Picture you two tomorrow, breakfast by the ocean.\"",["\"The hotel opened a year and a half ago.\"","\"Here's your invitation, folks, enjoy.\"","\"We have two more hotels coming soon.\""],"It puts them in the moment."),
    LISTEN("n33","03",10,10,"Listen. What does seeing a room let them do?","Picture the quality of a future stay",["Pick the room they'll sleep in tonight","See the price of a membership first","Take a nap after the breakfast"],"That's future pacing, right in the voice notes."),
    Q("n34","When is the best moment to hand over the invitation?","When they're smiling or excited",["When they check their phones","When they start to walk away","Before you even say hello"],"Link the good feeling to the invitation."),
    LISTEN("n35","08",2,3,"Listen. Why say \"breakfast tends to eat about half of that\"?","It's true and doesn't pin down a time",["Breakfast takes exactly 45 minutes","It makes the tour sound shorter","The hostesses ask you to say it"],"Simple, never false. They still know: 90 minutes."),
    MATCH("n36","Match each move to what it does",[["Pacing","Says what's true now"],["Leading","Takes the next step"],["Future pacing","Pictures tomorrow"],["Anchoring","Links a good feeling"]],"Pace, lead, picture it, anchor it."),
    BUILD("n37","Help them picture tomorrow.","Picture the two of you at breakfast by the ocean.",["maybe","if"],"Future pacing: put them in the moment.")
  ]
},
{
  id: "nlp4", name: "Read and reframe", sub: "Spot a real yes, turn objections around", icon: "eye",
  notes: [
    { h: "Read the real answer (calibration)", li: [
      "Watch faces, bodies and voices, not only words. The voice notes call it taking their temperature.",
      "Real yes: eye contact, both nod, they ask about breakfast or the room, they give their number easily.",
      "Fake yes: \"we'll try\", \"we'll see\", a look at each other, short answers, feet turned away." ],
      hear: { clip: "07", from: 2, to: 3 } },
    { h: "When you hear doubt", li: [
      "Stay calm and ask again: \"Sorry if I misunderstood, I thought you were pretty sure you were coming.\"",
      "Still unsure? A solid no is better than a fake yes." ],
      hear: { clip: "07", from: 4, to: 4 } },
    { h: "Answer the doubt early (pre-frame)", li: [
      "Answer a doubt before they say it.",
      "\"We're not selling timeshare: no weeks, no points, no maintenance fees.\"",
      "\"There's no obligation to be a member to stay with us.\"" ],
      hear: { clip: "05", from: 17, to: 17 } },
    { h: "Give the objection a new meaning (reframe)", li: [
      "\"We already own a timeshare.\" You: \"Perfect, then you know how much a good vacation matters. This is a hotel, no weeks or points.\"",
      "\"We don't want to commit.\" You: \"Good news, there's no obligation to book or buy. Just breakfast, a tour and information.\"",
      "\"We have plans tomorrow.\" You: \"What time are your plans? We start at 8, so you keep most of your day.\"",
      "\"Sounds like a scam.\" You: \"I get it, it sounds too good. That's why it's an Open House: come see the hotel for yourself.\"" ],
      hear: { clip: "04", from: 4, to: 9, label: "Hear the objections" },
      say: "Perfect, then you already know how much a good vacation matters.", sayId: "n4a" },
    { h: "Honest only", li: [
      "NLP helps people feel understood and make a clear choice.",
      "If it's not for them, let them go with a smile. We still want them staying at our hotel." ] }
  ],
  qs: [
    Q("n38","What does calibrating mean?","Reading face, body and voice",["Checking their credit card","Setting your watch for the tour","Measuring the walk to the hotel"],"Watch for the real answer, not only the words. The voice notes call it taking their temperature."),
    LISTEN("n39","07",2,3,"Listen. What are you doing when you watch how they answer?","Taking their temperature",["Writing the invitation","Checking their IDs","Counting the gifts"],"Calibrating: is it a real yes or a polite one?"),
    Q("n40","Which one is a real yes?","They nod and give their number easily",["\"We'll try to make it, maybe tomorrow.\"","\"Sure, sure. We'll see how we feel.\"","They look at each other, then say \"OK\""],"Real interest shows in easy answers and questions about breakfast or the room."),
    Q("n41","\"We'll try to make it.\" What does that tell you?","There's doubt, so ask again",["They're coming for sure","They want a bigger gift","They want a later time"],"\"Try\" means maybe. Ask again, calmly."),
    Q("n42","They hesitate. Which line checks without pushing?","\"Sorry, I thought you were pretty sure.\"",["\"Come on, guys, it's all free, let's go!\"","\"You really have to come now, folks.\"","\"OK, never mind. Have a nice day, guys.\""],"Calm and honest, and it brings out the real answer."),
    Q("n43","What is a pre-frame?","Answering a doubt before they say it",["Framing the invitation for them","Booking the time before you ask","Taking their photo first"],"\"We're not selling timeshare: no weeks, no points, no maintenance fees.\""),
    Q("n44","What is a reframe?","Giving an objection a new meaning",["Changing the invitation time","Saying the pitch again, louder","Telling them they're wrong"],"Agree with the feeling, then show it another way."),
    Q("n45","\"We already own a timeshare.\" Which reply reframes it?","\"Then you know a good vacation matters. This is a hotel.\"",["\"Timeshares are a bad deal. You should sell it.\"","\"Then I'm sorry, you can't come with us.\"","\"Don't worry about that, it doesn't matter.\""],"Turn it into common ground, then lead."),
    Q("n46","\"We don't want to commit to anything.\" Best reply?","\"Good: there's no obligation to book or buy.\"",["\"You'll have to commit to a little.\"","\"Everyone commits in the end, folks.\"","\"Then this really isn't for you.\""],"True, it's in the pitch deck, and it takes away the fear."),
    Q("n47","\"We have plans tomorrow.\" Best reply?","\"What time? We start at 8, so you keep most of your day.\"",["\"Can't you just cancel your plans for us?\"","\"Don't worry, it only takes 30 minutes.\"","\"Then come next year instead, no problem.\""],"Work the objection. Never cut the time into minutes."),
    MATCH("n48","Match each objection to a reframe",[["\"We own a timeshare\"","You know vacations matter"],["\"We don't want to commit\"","No obligation to buy"],["\"We have plans\"","Start at 8, keep your day"],["\"Sounds like a scam\"","Come see it yourself"]],"Agree with the feeling, then give it a new meaning."),
    Q("n49","When should you let a couple go?","When it's really not for them",["Never, keep pushing","When they ask about breakfast","When they give their number"],"A solid no beats a fake yes. Let them go with a smile.")
  ]
},
{ id: "final", name: "Final run", sub: "Everything mixed: 20 in a row", icon: "trophy", final: true, count: 20, notes: [] }
];

/* NLP practice lines for Say it, taken from the guidebook notes that have a sayId.
   They're new lines, so there's no recording to play. */
const NLP_LINES = Object.fromEntries(LEVELS.flatMap(L => (L.notes || []).filter(n => n.sayId).map(n => [n.sayId, { id: n.sayId, text: n.say }])));
