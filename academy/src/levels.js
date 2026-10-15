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
    { h: "Central and South America and the Caribbean: full gift (Q)", li: [
      "Mexico counts as Central America. Not Aruba, Cuba, Venezuela, Haiti or Ecuador.",
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
    Q("q5","USA or Canada. What's the work rule?","One of them works or is retired",["Both of them must have a full-time job","Retired couples can never qualify","Work doesn't matter, only their age"],"One of them employed or retired is enough."),
    Q("q6","USA or Canada. Which cards work for the full gift?","Visa, Mastercard, Amex or Discover",["Visa, Mastercard or Amex. No Discover","Any debit card from their bank","A cash deposit at the hotel desk"],"Any of those four credit cards. A debit card only works for the half gift (CT)."),
    Q("q7","What's the language rule?","Both fluent in English, or both in Spanish",["One of them fluent in English is enough","Any language, as long as a translator comes","Both fluent in English. Spanish doesn't count"],"Both must speak the same language fluently: English or Spanish."),
    Q("q8","Where must guests be staying?","A hotel, timeshare or rental they pay for",["Anywhere, even for free with friends or family","Only at an Iberostar hotel on the island","Only at an all-inclusive resort they booked"],"They must be paying for where they stay."),
    Q("q9","How long is the presentation?","90 minutes, breakfast included",["45 minutes, plus a full breakfast","30 minutes, breakfast is after","2 hours, breakfast included"],"90 minutes, and that includes breakfast."),
    Q("q10","How much free time do they need that morning?","3 hours, with no paid activities",["90 minutes, the length of the tour","2 hours, paid plans after are fine","Just until breakfast is over"],"The presentation is 90 minutes, but they need 3 free hours with nothing paid booked."),
    Q("q11","It's their departure day. When can they still tour?","At least 4 hours before pickup, or 5 before the flight if they rent a car",["At least 2 hours before pickup, or 3 before the flight if they rent a car","Any time, as long as it's before they check out of their hotel","They can't take the tour at all on the day they fly back home"],"At least 4 hours before airport pickup, or 5 hours before the flight if they drive a rental car."),
    Q("q12","A couple from Mexico, Colombia or Peru. What ages get the full gift?","40 to 60",["32 to 70","45 to 55","35 to 65"],"Central and South America and the Caribbean: 40 to 60, the man's age."),
    Q("q13","Which countries are left out of the rules for Central and South America and the Caribbean?","Aruba, Cuba, Venezuela, Haiti, Ecuador",["Bolivia, Brazil, Chile, Peru, Uruguay","Mexico, Colombia, Peru, Panama, Chile","Costa Rica, Panama, Jamaica, Belize, Bahamas"],"Guests from Aruba, Cuba, Venezuela, Haiti and Ecuador get no gift (NQ)."),
    Q("q14","A couple from Colombia, both 55, both retired. Which gift?","No gift (NQ): one must be working",["Full gift (Q): retired is fine","Half gift (CT): they're retired","Full gift (Q), with a Visa"],"Central and South America and the Caribbean: one of them must work. No retirees."),
    Q("q15","A couple from Central or South America, or the Caribbean. Which card does NOT work?","Discover",["Visa","Mastercard","American Express"],"Only Visa, Mastercard or American Express. Discover works only for the USA and Canada."),
    Q("q16","A couple from Argentina. What ages get the full gift?","45 to 55",["40 to 60","32 to 70","35 to 70"],"Argentina: 45 to 55, the man's age."),
    MATCH("mq","Match each guest to their full-gift (Q) ages",[["USA or Canada couple","32 to 70"],["Mexican couple","40 to 60"],["Argentinian couple","45 to 55"],["USA single woman","40 to 65"]],"Full gift: USA and Canada 32 to 70, Mexico 40 to 60, Argentina 45 to 55, USA single women 40 to 65.")
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
      "Iberostar The Club members staying off property: the GI team may invite them. Q if they bring IDs and a credit card.",
      "Iberostar The Club beneficiaries staying off property: can't be invited. NQ." ] }
  ],
  qs: [
    Q("c1","What does a CT guest get?","The half gift",["The full gift","No gift at all","Two half gifts"],"Q = full gift. CT (courtesy tour) = half gift. NQ (not qualified) = no gift."),
    Q("c2","A couple from the USA or Canada. What ages get the half gift (CT)?","28 to 31, or 71 and up",["25 to 31, or 65 and up","18 to 31, or 70 and up","30 to 31, or 71 and up"],"USA and Canada: 28 to 31, or 71 and up, get the half gift."),
    Q("c3","USA or Canada, half gift (CT). Which card can they show?","A debit card or a credit card",["Only a credit card, never debit","Only an American Express card","No card at all, just an ID"],"Debit only works for the USA and Canada half gift (CT)."),
    Q("c4","USA or Canada, half gift (CT). What's the shortest presentation?","60 minutes",["30 minutes","45 minutes","90 minutes"],"At least 60 minutes."),
    Q("c5","A couple from Argentina. What ages get the half gift (CT)?","35 to 44, or 56 to 70",["28 to 31, or 71 and up","30 to 44, or 56 and up","40 to 44, or 56 to 60"],"Argentina: 35 to 44 and 56 to 70 get the half gift. 45 to 55 get the full gift."),
    Q("c6","Which job means no gift (NQ)?","Airline pilot or flight attendant",["Nurse or doctor at a big hospital","Police officer or a firefighter","School teacher or school principal"],"Commercial airline pilots and crew get no gift."),
    Q("c7","Which military guest can still qualify?","National Guard",["Active Army","Active Navy","Active Coast Guard"],"Active US military gets no gift. The National Guard is OK."),
    Q("c8","Which guest gets no gift (NQ)?","A travel agent on vacation",["A hospital nurse on vacation","A school teacher on vacation","A National Guard member"],"Travel agents, tour operators, and people who work for hotels, timeshares or vacation clubs get no gift."),
    Q("c12","Three couples traveling together. Which gift?","No gift (NQ)",["Three full gifts","One shared gift","Three half gifts"],"Three couples or more together (Trinella or Trifecta) get no gift."),
    Q("c13","Two qualified couples traveling together (Quinella). What do they get?","2 invitations, 2 gifts, 1 pay",["1 invitation, 1 gift, 1 pay","2 invitations, 1 gift, 2 pays","No gift: groups can't tour"],"Quinella: 2 invitations, 2 gifts, 1 pay. Sales decides if they tour together."),
    Q("c15","What do guests show the hostess?","Their IDs and a credit card",["Their hotel key card and receipt","Their flight tickets home","Only the invitation, nothing else"],"IDs and a credit card at check-in."),
    Q("c16","Which one counts as a paid activity?","A prepaid airport transfer",["A walk on Eagle Beach","A swim in their hotel pool","Breakfast at their hotel"],"Excursions, spa, pre-arranged transfers or anything prepaid."),
    Q("c17","What's the dress code for the tour?","Shirts and shoes, no bathing suits",["Anything goes, they're on vacation","Business casual, jackets for men","Swimwear is fine with a cover-up"],"Shirts and shoes required. No bathing suits."),
    Q("c18","An Iberostar The Club member is staying off property. Can they come?","Yes: the GI team can invite them, as Q",["No: members always count as no gift","Yes, but only with the half gift (CT)","No: members can never take the tour"],"The GI team may invite them. They're Q if they bring IDs and a credit card."),
    Q("c19","An Iberostar The Club beneficiary is staying off property. Can they come?","No: they can't be invited (NQ)",["Yes, as Q with IDs and a credit card","Yes, but only with a half gift (CT)","Yes, if they're between 40 and 60"],"Beneficiaries staying off property can't be invited."),
    MATCH("mc","Match each rule to its number",[["Wait after an in-house tour","6 months"],["Wait after a street tour","12 months"],["Most people in one party","6"],["Most adults in one party","4"]],"An in-house tour in the last 6 months, or a street program in the last 12, means no gift. A party is at most 6 people and 4 adults.")
  ]
},
{
  id: "who", name: "Who qualifies?", sub: "Real couples: Q, CT or NQ", icon: "couple",
  gen: true, count: 12,
  notes: [
    { h: "Check a couple in this order", li: [
      "Where are they from? USA or Canada, Argentina, or Central America (Mexico too), South America and the Caribbean (not Aruba, Cuba, Venezuela, Haiti or Ecuador). Anyone else, like Europeans: NQ.",
      "How old is the man? Which age band is that?",
      "Are they a couple? Singles: only USA women, 40 to 65.",
      "Do they work? Retired is OK for USA and Canada only.",
      "Which card? Discover works only for the USA and Canada. Debit works only for the USA and Canada half gift (CT).",
      "Same language, paying for their stay, 3 free hours.",
      "Any reason for no gift? Their job, the military, a recent tour, 3 or more couples." ] },
    { h: "Age bands (the man's age)", li: [
      "USA and Canada: under 28 NQ, 28 to 31 CT, 32 to 70 Q, 71+ CT.",
      "Central and South America and the Caribbean: 40 to 60 Q, any other age NQ.",
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
      say: "Yes, folks, I'm part of the team inviting families to come see the newest hotel on the island. Once you've seen it, next time you travel you'll want to stay with us. It also helps us spread the word: you tell family and friends, maybe post a picture on Facebook or Instagram." },
    { h: "Then the good news, in this order", li: [
      "It's a full branding experience, not just a quick look at the hotel.",
      "Breakfast at one of our five-star restaurants.",
      "A personal tour of the property: the facilities and the service.",
      "See one of our rooms.",
      "A thank-you for their time: IberoCash for the best restaurants, activities and shopping on the island.",
      "The pitch deck adds one more: their taxi is on us, both ways." ] },
    { h: "Make it personal", li: [
      "See a Riu bracelet? \"You're probably eating breakfast at the same place every day. This is something new and different.\"",
      "We partner with the best (Gianni's, Screaming Eagle, Daniel's) because everybody wants to be associated with Iberostar.",
      "We've invested in Aruba: the Tierra del Sol golf course and community, our first hotel, and two more coming." ] },
    { h: "Offer the invitation", li: [
      "Say \"Let me get you an invitation.\" Don't ask \"Would you like one?\"",
      "They either let you keep going, or they tell you their objections now.",
      "Already own timeshare, don't want to commit, plans tomorrow: all of these can be worked.",
      "The only one you really can't work: they leave tomorrow morning." ] }
  ],
  qs: [
    Q("w1","Crawl, walk, run. What does \"run\" mean?","Making solid bookings",["Stopping lots of people","Writing more invitations","Talking to every couple"],"Crawl: stop people. Walk: write invitations. Run: solid bookings that show up."),
    Q("w19","Which three doubts do you remove first?","A scam, timeshare, or selling activities",["The price, the long distance and the weather","Breakfast, parking and the dress code","Their language, their IDs and their card"],"Guests worry it's a scam, timeshare, or an activities booth. Remove those doubts first."),
    Q("w2","You open with \"Free breakfast and a gift!\" What do guests think?","It's a scam, not true, or timeshare",["Great! Where do we sign up?","That the gift should be bigger","That they need more details first"],"Leading with the gift creates doubt. Lead with why."),
    LINE("w16","If you tell them ___ first, it removes the doubt.","why",["the gift","the price","the time"],"Why before how. Once they know why you stopped them, the offer makes sense."),
    Q("w4","Which opener says why first?","\"We're inviting families to see the island's newest hotel.\"",["\"Do you guys want a free breakfast and a $100 gift today?\"","\"Hey folks, have you been down to Eagle Beach yet this week?\"","\"Quick question, folks: do you two own a timeshare at home?\""],"Why first: we want them to see the hotel, love it, and stay with us."),
    Q("w5","Besides wanting them to stay with us, why do we invite them?","So they tell family and friends",["So we can sell them some excursions","So the restaurant looks busy and full","So we can collect their email addresses"],"Guests who see it tell people and post pictures. That's good marketing."),
    LINE("w20","We're inviting families for a full ___ experience, not just a quick look at the hotel.","branding",["shopping","wellness","dining"],"A full branding experience: breakfast, a personal tour, a room, and a thank-you for their time."),
    Q("w6","In what order do you share the good news?","Breakfast, tour, room, then the gift",["Gift, breakfast, room, then the tour","Room, gift, breakfast, then the tour","Tour, gift, room, then the breakfast"],"Breakfast, a personal tour, a room, and the gift last, as a thank-you."),
    Q("w7","The guest wears a Riu bracelet. What do you say?","\"Same breakfast every day? This is something new.\"",["\"Riu isn't nearly as nice as our hotel, you know.\"","\"Sorry, folks, guests from Riu can't come with us.\"","Nothing. Where they're staying doesn't matter."],"Use what you see to make it personal: something new, something different."),
    LINE("w18","The best part is, we also ___ you for your time, as a way of saying thanks.","reward",["test","charge","upgrade"],"The gift is a thank-you for their time, and it comes last."),
    Q("w10","What shows guests we've invested in Aruba?","Tierra del Sol, one hotel, two more coming",["The cruise terminal and the new airport wing","A casino and two big nightclubs downtown","A water park and the new mall in town"],"We own the Tierra del Sol golf course and community, opened our first hotel, and have two more coming."),
    Q("w12","Why say \"Let me get you an invitation\" instead of asking?","It brings out their objections now",["It's shorter and easier for you to say","It sounds more polite to the guests","Guests aren't allowed to say no to it"],"They either let you keep going, or tell you their objections now, so you can work them."),
    Q("w13","\"We already own a timeshare.\" What is that?","An objection you can work with",["A good reason to let them go","An automatic no gift (NQ) for them","A problem only for guests from the USA"],"Owning a timeshare can be worked. See the NLP unit for how."),
    BUILD("bw1","How do you offer the invitation?","Let me get you an invitation.",["Would","like"],"Don't ask if they want one. Say it: Let me get you an invitation."),
    LISTEN("lw1","02",7,9,"Listen to this opener. What's wrong with it?","It leads with the gift",["It's much too long","It forgets the breakfast","It names the wrong beach"],"Free breakfast and $200 up front sounds like a scam, not true, or timeshare. Lead with why."),
    LISTEN("lw2","04",10,10,"Listen. Which objection can't you work?","They're leaving tomorrow morning",["They already own a timeshare at home","They don't want to commit to anything","They have plans for tomorrow"],"Every other objection is a chance to turn it around.")
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
      "Every adult: 2 forms of ID, like a driver's license or passport.",
      "A credit card: only one of them needs to bring one." ] },
    { h: "Our partners", li: [
      "At Joia: Marea, Bucatini, Gaia and the Zima rooftop bar.",
      "Dining around the island: Gianni's, Daniel's Steak & Chop, Azzurro, Azia, Amore Mio, Screaming Eagle, Dushi Bagels & Burgers, and The Birdie at Tierra del Sol.",
      "Golf: Tierra del Sol. Tours: Rocka Beach Tours. Shopping: Aruba Aloe. Car rental: Elixir Car Rental." ] }
  ],
  qs: [
    Q("o1","What's the promotion called?","Our Open House Promotion",["The Timeshare Preview","The VIP Sales Event","The Beach Breakfast Club"],"The pitch deck and the voice notes both call it the Open House Promotion."),
    Q("o3","Which four promises are in the pitch deck?","No timeshare, no high pressure, no obligation, short and sweet",["Free stays, free flights, free spa days and free golf rounds","Members only, book today, pay later, no refunds, cash only","No dress code, no ID needed, free drinks, stay as long as you like"],"No timeshare. No high pressure. No obligation. Short and sweet."),
    Q("o4","Where does the morning start?","In the Main Lobby, with the hostesses",["At the beach bar, next to the main pool","At a sales office in downtown Oranjestad","At the golf clubhouse in Tierra del Sol"],"The hostesses check them in at the Main Lobby, then it's off to breakfast."),
    Q("o5","How does the free taxi work?","They take a taxi, and we pay both ways",["We send our own shuttle to their hotel","We pay for the ride there, not back","Only Iberostar hotel guests get a taxi"],"They arrange the taxi. We pay the fare when they arrive and again when they leave."),
    Q("o7","What is the Island Gift?","IberoCash for Aruba's top places",["A free night at the Joia hotel","Cash handed out at the desk","A discount on a timeshare week"],"A thank-you for their time, to use for dining, shopping, activities and rentals."),
    Q("o8","Where can guests use IberoCash?","Dining, shopping, activities, rentals",["Flights, hotels, cruises, trains","Groceries, gas, pharmacy, phone bills","Casino, lottery, bets, ATM cash"],"The pitch deck lists dining, shopping, activities and rentals."),
    Q("o14","Besides the invitation, what do they bring?","2 IDs each, and one credit card",["2 IDs each, and a credit card each","Only the invitation, nothing more","Their hotel key card and receipt"],"Every adult brings 2 forms of ID, like a driver's license or passport. One credit card for the couple is enough."),
    LINE("o15","Members book direct at ___ rates through our loyalty club.","wholesale",["retail","timeshare","weekly"],"Members book direct at wholesale rates. We don't sell timeshare: no weeks, points or maintenance fees."),
    LINE("o16","We ask for 90 minutes, including breakfast, the tour and information on ___.","booking direct",["buying a week","points and fees","the casino"],"Short and sweet: 90 minutes, including the breakfast, the property tour and information on booking direct."),
    Q("o18","How does the pitch deck describe Iberostar The Club?","The newest, most luxurious way to travel",["A timeshare with weeks, points and fees","A members-only resort here in Aruba","The most affordable way to take a cruise"],"The pitch deck calls Iberostar The Club the newest and most luxurious way to travel."),
    PIC("pj","img/photos/joia-beach.jpg","The Joia by Iberostar resort on its beach","Where do guests go for the Open House?","The Joia by Iberostar, on Eagle Beach",["A sales office in downtown Oranjestad","A partner resort on Palm Beach","The clubhouse at Tierra del Sol"],"The Joia by Iberostar Resort, in the heart of Eagle Beach."),
    PIC("ps","img/photos/joia-suite.jpg","A Joia suite living room","What do guests see on the VIP Property Tour?","The resort's VIP features and suites",["A timeshare sales office downtown","The VIP lounge at the airport","Model homes for sale near the beach"],"So they see what awaits their family when they choose Iberostar."),
    PIC("pm","img/photos/marea.jpg","A dish at Marea","What is Marea?","A restaurant at Joia",["A car rental partner","A golf course nearby","A boat tour company"],"Marea, Bucatini, Gaia and the Zima rooftop bar are all at Joia."),
    PIC("pg","img/photos/golf.jpg","The Tierra del Sol golf course","What is Tierra del Sol?","Iberostar's golf course and community",["A private beach club on Palm Beach","A car rental company in Oranjestad","The island's cruise ship terminal"],"We own the Tierra del Sol golf course and community. The Birdie is its restaurant."),
    PIC("pr","img/photos/rocka.jpg","A Rocka Beach Tours jeep","What does Rocka Beach Tours offer?","Off-road tours, karting and sailing",["Car rentals and airport taxis only","Fine dining and drinks on the beach","Spa days and massage treatments"],"Rocka Beach Tours is our tours partner."),
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
      "While you write, they stay: it's manners. Only about 1 family in 100 walks away.",
      "Keep making a friend. Ask small questions about them. If they like you, trust you and believe you, they buy from you." ] },
    { h: "Phone number: say why", li: [
      "A manager or supervisor calls this afternoon, around 5 to 6, only to check they can still make it. WhatsApp works.",
      "Said this way, they feel like VIPs and don't give a fake number." ],
      say: "Folks, we also do confirmation calls. If you give me your number (WhatsApp is fine), one of my managers can reach out this afternoon between 5 and 6, simply to ask if you're still able to make it. We're not allowed to solicit or anything like that." },
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
      "Still unsure? Say you may give the invitation to another family. A solid no beats a fake yes.",
      "You can tell them: \"I get a $65 bonus just for you showing up. You don't have to book or buy anything.\"",
      "Your job isn't handing out invitations. It's getting people to the hotel." ] }
  ],
  qs: [
    Q("s3","What should you do while you write the invitation?","Slow down and keep making a friend",["Write fast before they leave","Stay quiet and just keep writing","Let them fill it in themselves"],"This is the best time to build the bond."),
    Q("s4","Why is it safe to slow down while you write?","Only about 1 family in 100 walks away",["They already signed the invitation","The gift is already promised to them","A manager is watching from nearby"],"Once you're writing, they stay. It's manners."),
    Q("s7","How do you explain what we are?","A hotel, plus a club to book direct",["A timeshare with great prices on weeks","A water sports and excursions company","Just a free breakfast, nothing more"],"A hotel like Hyatt or Hilton, plus a club to book direct with preferred rates and perks."),
    Q("s8","Do guests have to be members to stay at the hotel?","No, it's a hotel like Hyatt or Hilton",["Yes, only members can book a room","Yes, but they can sign up at check-in","Only for stays longer than a week"],"No obligation. Members just get discounts and perks."),
    Q("s9","How do you ask for their phone number?","Say why: a short call between 5 and 6",["Just ask for it and keep on writing fast","Say we'll text them special offers later","Skip it. Asking scares most people off"],"Give the reason first. They feel like VIPs and don't give a fake number."),
    Q("s13","They say \"We'll try\" or \"We'll see.\" What do you do?","Ask again: other families want this spot",["Say \"Great, see you tomorrow!\" and leave","Promise them a bigger gift if they come","Let it go, and wish them a great day"],"Go back and get a real answer. Lots of families want to come."),
    LINE("s14","It's better to get a solid no than a bunch of fake ___.","yeses",["maybes","numbers","gifts"],"Fake yeses don't show up. A solid no frees you to find a family who will."),
    Q("s15","They're still unsure after you asked again. Now what?","Say you may give it to another family",["Write it for them anyway and hope","Give them two invitations to be safe","Ask for their credit card to hold it"],"\"I wouldn't want to hold a space if you're not sure you can make it.\""),
    Q("s17","What is your real job?","Getting people to the hotel",["Handing out invitations","Talking to everyone you see","Collecting phone numbers"],"This is a show-up business, not an invitation business."),
    LINE("s18","We only ask families for ___ minutes, and breakfast tends to eat about half of that.","90",["45","60","30"],"Say 90 minutes. Breakfast eats about half. Never break it into minutes."),
    Q("s19","Why never say \"45 minutes\"?","They feel misled when the hostess says 90",["45 minutes sounds too long to most guests","It's against the hotel's legal rules","Breakfast alone takes longer than that"],"Never mention minutes. All they need to know is 90."),
    Q("s20","Why tell them they'll hear about booking direct with the club?","So they arrive curious, not surprised",["It's a legal rule for the tour","So fewer families show up tomorrow","So the tour itself gets much shorter"],"Guests who know what's coming are open to it. Surprised guests close their eyes and ears."),
    BUILD("bs1","How do you book the time?","Let me put you down for 8 o'clock.",["maybe","7"],"Start with 8. If it's too early for them, offer 10."),
    BUILD("bs2","How do you lock in the show-up?","So we see you guys tomorrow at 8 for sure?",["maybe","try"],"Ask again before they walk away, and watch how they answer.",["So we see you guys at 8 tomorrow for sure?"]),
    LISTEN("ls1","06",9,9,"Listen. When does the manager call?","This afternoon, between 5 and 6",["Tomorrow at 7 o'clock in the morning","Right before the tour starts at 8","Tonight at 9, at their hotel room"],"A short call, only to see if they can still make it."),
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
    LINE("k5","\"After breakfast, they're going to give you a ___ tour of the property.\"","personalized",["five-minute","professional","standard"],"A personalized tour, so they see the facilities and the service for themselves.",["03",9,9]),
    LINE("k6","\"So you'll be able to ___ the quality that you'll receive when you stay with us.\"","anticipate",["underestimate","negotiate","pay for"],"Seeing a room lets them picture their future stay.",["03",10,10]),
    LINE("k7","\"Everybody wants to be ___ with Iberostar.\"","associated",["charged","compared","competing"],"That's why the best companies on the island partner with us.",["03",15,15]),
    LINE("k8","\"Let me get you an ___.\"","invitation",["upgrade","appointment","offer"],"Say it. Don't ask if they'd like one.",["04",1,1]),
    LINE("k9","\"Let me put you down for ___ o'clock.\"","8",["7","9","11"],"Start with 8. If it's too early for them, offer 10.",["05",0,0]),
    LINE("k10","\"Make sure to bring this invitation with you to confirm which ___ you are offered.\"","gift",["room","time","tour"],"The invitation confirms their gift.",["05",15,15]),
    LINE("k11","\"We don't have any weeks or points or ___ fees.\"","maintenance",["reservation","cleaning","parking"],"We're not selling timeshare: no weeks, no points, no maintenance fees.",["05",17,17]),
    LINE("k12","\"One of my managers… can reach out to you this afternoon… simply to ask you if you're still able to ___ it.\"","make",["miss","book","sell"],"The call is only to check they can still make it.",["06",9,9]),
    LINE("k13","\"Sorry if I ___, but I thought you were pretty sure you were coming.\"","misunderstood",["interrupted","bothered you","pushed you"],"Calm and honest. It brings out the real answer.",["07",4,4]),
    LINE("k14","\"We certainly wouldn't want to ___ a space… if you're not sure you're going to make it.\"","block",["sell","clean","paint"],"Lots of families want to come. A space shouldn't go to a maybe.",["07",9,9]),
    LINE("k15","\"You know what, guys, maybe I should give this invitation to ___.\"","somebody else",["your neighbors","the front desk","the hostess"],"Still unsure after you asked again? Offer it to another family.",["07",15,15]),
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
      "Match their speed: in a hurry, keep it short. Taking it easy, take your time." ] },
    { h: "Use their words", li: [
      "Repeat the words they use. They say \"relax\", you say \"relax\". They say \"the kids\", you say \"the kids\".",
      "Repeat key details back, and use their names once you know them." ],
      say: "Ohio! How's your first week in Aruba going?", sayId: "n1a" },
    { h: "Make a friend while you write", li: [
      "Ask easy, friendly questions and really listen: where they're from, first time in Aruba, what they've liked so far.",
      "Talk less than they do. Smile. Nod." ],
      say: "Where are you guys from? First time in Aruba?", sayId: "n1b",
      hear: { clip: "05", from: 10, to: 12 } },
    { h: "Check that it's working", li: [
      "Rapport: they smile, lean in, ask questions and tell you things.",
      "Not yet: short answers, arms crossed, looking away. Slow down, match them, ask something easy." ] }
  ],
  qs: [
    Q("n1","What is NLP?","How to connect, choose words and read people",["A script you have to read out word for word","A list of all the free gifts we offer","A set of rules from the qualifications PDF"],"Neuro-linguistic programming: match people, choose your words, read their reactions."),
    Q("n2","When is it wrong to use NLP?","To trick or pressure a guest",["To match a guest's mood and pace","To give the guest a clear choice","To make a guest feel really heard"],"Use it so people decide for real. The pitch deck promises no high pressure and no obligation."),
    LISTEN("n3","05",13,13,"Listen. When do guests buy from you?","When they like, trust and believe you",["When the gift is big enough for them","When you talk fast and keep it short","When you show them the price up front"],"Rapport first: like, trust, believe."),
    Q("n4","A couple talks slowly and quietly. How do you talk?","Slower and quieter, like them",["Faster, to bring up their energy","Louder, so they can hear you well","The same way you talk to everyone"],"Match their speed and volume. People relax with people like them."),
    Q("n5","What is mirroring?","Matching their posture, softly and a bit later",["Copying every move they make, right away","Repeating every word they say back, exactly","Standing very close and looking right at them"],"Soft and a little later. Copying every move feels strange."),
    Q("n6","The guest says: \"We just want to relax this trip.\" Which reply uses their words?","\"Then you'll love it: a relaxed breakfast, no rush.\"",["\"Then you need our jeep tour, folks, it's a blast!\"","\"OK, but first you need to listen to this offer.\"","\"Beach days get boring after a while, trust me.\""],"Use their word back: relax. It shows you listened."),
    Q("n7","Which question builds rapport while you write?","\"First time in Aruba?\"",["\"Can you sign right here?\"","\"How much do you earn?\"","\"What's your room number?\""],"Easy and friendly. Ask, then listen."),
    Q("n8","Which sign shows you have rapport?","They smile, lean in and ask questions",["They keep checking their phones a lot","They answer everything in one word","They keep walking while you talk"],"Watch for it. No rapport yet? Slow down and match them."),
    Q("n9","Short answers, arms crossed, looking away. What do you do?","Slow down, match them, ask something easy",["Talk faster so they don't walk away","Go straight to the gift and the IberoCash","Hand them the invitation right away"],"Build rapport first. Then lead."),
    Q("n10","Why repeat details back, like \"Ohio! How's the trip?\"","It shows you listened, so they open up",["It fills the silence while you write","It tests their memory, just a little","It makes the conversation last longer"],"Repeating their words is one of the fastest ways to build rapport."),
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
      "Offer two good options, so either answer is a yes. NLP calls it a double bind.",
      "Use it for the confirmation call: \"Is WhatsApp or a regular call better for you?\"",
      "Not for the time. Start with 8, and offer 10 only if 8 is too early." ],
      hear: { clip: "06", from: 7, to: 9, label: "Hear the call line" },
      say: "Is WhatsApp or a regular call better for you guys?", sayId: "n2b" },
    { h: "Say because", li: [
      "A reason makes a request feel fair, so more people say yes.",
      "Give the reason when you ask: \"We do confirmation calls, so can I get your number?\"" ],
      hear: { clip: "06", from: 6, to: 6 } },
    { h: "Tag questions", li: [
      "End with a small question that invites a yes: \"right?\", \"for sure?\"",
      "\"You guys love a good breakfast, right?\" \"So we see you tomorrow at 8 for sure?\"" ],
      hear: { clip: "07", from: 1, to: 1 } },
    { h: "Small words that matter", li: [
      "Say \"and\" when both parts matter. \"But\" pulls attention away from what came before it.",
      "Drop \"try\" and \"maybe\". They sound unsure." ] }
  ],
  qs: [
    Q("n13","\"Let me get you an invitation.\" Which NLP move is that?","Assuming the yes (presupposition)",["Asking for a quick yes (tag question)","Changing the meaning (reframe)","Copying the guest's moves (mirroring)"],"It takes the yes for granted, so doubts come out now."),
    Q("n14","Which line assumes they're coming?","\"When you come tomorrow, bring the invitation.\"",["\"If you want to, maybe you could come by tomorrow.\"","\"Would you two be interested in a tour tomorrow?\"","\"Do you guys even like a big hotel breakfast?\""],"\"When\" assumes it's happening. \"If\" and \"would\" invite a no."),
    LISTEN("n15","05",0,2,"Listen. When do you offer 10 o'clock?","Only if they say 8 is too early",["Always, right after you offer 8","When the 8 o'clock tour is full","If they ask for a bigger gift"],"Start with 8. If they don't say it's too early, it's an easy booking."),
    Q("n16","Which question offers two yeses?","\"Is WhatsApp or a regular call better for you?\"",["\"Do you want a confirmation call or not, folks?\"","\"Would you mind if we called you later today?\"","\"Can you maybe give me a phone number, guys?\""],"Either answer is a yes to the call."),
    LINE("n17","Can I get your number, ___ we do confirmation calls this afternoon?","because",["unless","although","or"],"A reason makes the request feel fair."),
    Q("n18","Why does saying \"because\" work?","A reason makes the request feel fair",["It makes the line longer and slower","It sounds more formal and official","Guests like hearing longer words"],"Give the reason and more people say yes. The voice notes: say why when you ask."),
    Q("n19","Which line is a tag question?","\"You guys love a good breakfast, right?\"",["\"What do you guys eat for breakfast?\"","\"Breakfast starts at 8 o'clock in the morning.\"","\"Do you guys usually skip breakfast?\""],"A small \"right?\" at the end invites a yes."),
    Q("n20","\"It's 90 minutes, but breakfast eats about half.\" Which word should replace \"but\"?","and",["or","so","except"],"\"But\" pulls attention to what comes after it. Use \"and\" when both parts matter."),
    LISTEN("n25","07",1,1,"Listen. What does \"for sure?\" at the end ask for?","A clear yes that they'll come",["Their phone number and name","Bringing a bigger group along","Moving to a later time"],"A tag question asks for commitment. Then watch how they answer."),
    MATCH("n23","Match each move to its line",[["Assume the yes","\"When you come tomorrow…\""],["Two yeses","\"WhatsApp or a call?\""],["Because","\"…because we do confirmation calls\""],["Tag question","\"…great breakfast, right?\""]],"Four ways your words lead to a real yes."),
    BUILD("n24","Offer two choices for the confirmation call.","Is WhatsApp or a regular call better for you?",["maybe","if"],"Two yeses: either answer is a yes to the call.",["Is a regular call or WhatsApp better for you?"])
  ]
},
{
  id: "nlp3", name: "Pace and lead", sub: "Agree first, picture it, then lead", icon: "steps",
  notes: [
    { h: "Pace, then lead", li: [
      "Pace: say two or three things that are true for them right now. Each one is a small yes.",
      "Lead: then take them to the next step." ],
      say: "Beautiful day, right? Enjoying Eagle Beach? Yes, folks, we're inviting families to see the newest hotel on the island.", sayId: "n3a" },
    { h: "The voice notes do it", li: [
      "\"I see you have a bracelet from Riu. I'm sure you're eating breakfast at the same place every day.\" That's pacing.",
      "\"You're going to love our place. It's something new, something different for you.\" That's leading." ],
      hear: { clip: "03", from: 5, to: 8 } },
    { h: "Help them picture it (future pacing)", li: [
      "Help them see the good moment that's coming: the breakfast, the tour, the room.",
      "The voice notes: they see one of our rooms \"so you'll be able to anticipate the quality you'll receive when you stay with us.\"" ],
      hear: { clip: "03", from: 10, to: 10 },
      say: "Picture the two of you tomorrow, breakfast at one of our five-star restaurants.", sayId: "n3b" },
    { h: "Anchor the good moment", li: [
      "When they laugh or get excited, that's the moment to hand over the invitation or say the time.",
      "The good feeling gets linked to the hotel." ] },
    { h: "Simple, never false", li: [
      "\"We only ask families for 90 minutes, and breakfast tends to eat about half of that.\" It's true, and it doesn't break it into minutes.",
      "Never trade the truth for a yes." ],
      hear: { clip: "08", from: 7, to: 8 } }
  ],
  qs: [
    Q("n26","What is pacing?","Saying things that are true for them",["Talking about the price first","Talking fast to hold attention","Counting the minutes of the pitch"],"Small truths they agree with. Then you lead."),
    Q("n27","What is leading?","Taking them to the next step",["Walking a step in front of them","Talking much more than they do","Picking the gift for them"],"Pace first, then lead."),
    LISTEN("n28","03",5,8,"Listen. What does the Riu bracelet line do?","Names their routine, then offers something new",["Tells them that Riu is a worse hotel than ours","Asks them for their hotel name and room number","Checks whether they qualify for the full gift"],"Same breakfast every day (pace). Something new at our place (lead)."),
    Q("n29","A couple on Eagle Beach. Which is a pacing line?","\"Beautiful day on Eagle Beach, right?\"",["\"Let me get you an invitation, folks.\"","\"Do you two own a timeshare at home?\"","\"Can I get your phone number, folks?\""],"True for them right now, and easy to agree with."),
    Q("n30","How many easy yeses before you lead?","Two or three",["None at all","Ten or more","Just one, the invitation"],"A few small yeses make the next yes easier."),
    Q("n31","What is future pacing?","Helping them picture what's coming",["Booking them again for next year","Talking about the price later on","Walking a little ahead of them"],"\"Picture the two of you tomorrow at a five-star breakfast.\""),
    Q("n32","Which line helps them picture tomorrow?","\"Picture you two tomorrow at a five-star breakfast.\"",["\"The hotel opened a year and a half ago, folks.\"","\"Here's your invitation, folks. Enjoy your day.\"","\"We have two more hotels coming to the island.\""],"It puts them in the moment."),
    LISTEN("n33","03",10,10,"Listen. What does seeing a room let them do?","Picture the quality of a future stay",["Pick the room they'll sleep in","See the price of a membership first","Take a nap after the breakfast"],"That's future pacing, right in the voice notes."),
    Q("n34","When is the best moment to hand over the invitation?","When they're smiling or excited",["When they look down at their phones","When they start to walk away","Before you even say hello to them"],"Link the good feeling to the invitation."),
    LISTEN("n35","08",7,8,"Listen. Why say \"breakfast tends to eat about half of that\"?","It's true and doesn't pin down a time",["Breakfast takes exactly 45 minutes","It lets you skip saying 90 minutes","The hostesses ask everyone to say it"],"Simple, never false. They still know: 90 minutes."),
    MATCH("n36","Match each move to what it does",[["Pacing","Says what's true now"],["Leading","Takes the next step"],["Future pacing","Pictures tomorrow"],["Anchoring","Links a good feeling"]],"Pace, lead, picture it, anchor it."),
    BUILD("n37","Help them picture tomorrow.","Picture the two of you at a five-star breakfast tomorrow.",["maybe","if"],"Future pacing: put them in the moment.")
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
      "Stay calm and ask again: \"Sorry if I misunderstood, but I thought you were pretty sure you were coming.\"",
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
      "\"We have plans tomorrow.\" You: \"What time are your plans? We start at 8 and you're done by 11.\" They need 3 free hours with nothing paid.",
      "\"Sounds like a scam.\" You: \"I get it, it sounds too good. That's why it's an Open House: come see the hotel for yourself.\"" ],
      hear: { clip: "04", from: 4, to: 9, label: "Hear the objections" },
      say: "Perfect, then you already know how much a good vacation matters.", sayId: "n4a" },
    { h: "Honest only", li: [
      "NLP helps people feel understood and make a clear choice.",
      "If it's not for them, let them go with a smile. We still want them staying at our hotel." ] }
  ],
  qs: [
    Q("n38","What does calibrating mean?","Reading face, body and voice",["Checking their credit card","Setting your watch for the tour","Measuring the walk to the hotel"],"Watch for the real answer, not only the words. The voice notes call it taking their temperature."),
    LISTEN("n39","07",2,3,"Listen. What are you doing when you watch how they answer?","Taking their temperature",["Writing up the invitation","Checking their IDs and card","Counting the gifts left"],"Calibrating: is it a real yes or a polite one?"),
    Q("n40","Which one is a real yes?","They nod and give their number easily",["\"We'll try to make it, maybe tomorrow.\"","\"Sure, sure. We'll see how we feel.\"","They look at each other, then say \"OK\""],"Real interest shows in easy answers and questions about breakfast or the room."),
    Q("n41","\"We'll try to make it.\" What does that tell you?","There's doubt, so ask again",["They're definitely coming tomorrow","They're asking for a bigger gift","They'd like a later time slot"],"\"Try\" means maybe. Ask again, calmly."),
    Q("n42","They hesitate. Which line checks without pushing?","\"Sorry if I misunderstood, but I thought you were pretty sure.\"",["\"Come on, guys, it's all free! What's the problem here, folks?\"","\"You really have to come now, folks. It's a really great deal.\"","\"OK, never mind then. Have a nice day, guys. Enjoy Aruba!\""],"Calm and honest, and it brings out the real answer."),
    Q("n43","What is a pre-frame?","Answering a doubt before they say it",["Framing the invitation nicely for them","Booking the time before you even ask","Taking a photo of them before the tour"],"\"We're not selling timeshare: no weeks, no points, no maintenance fees.\""),
    Q("n44","What is a reframe?","Giving an objection a new meaning",["Changing the time on the invitation","Saying the whole pitch again, louder","Telling them politely they're wrong"],"Agree with the feeling, then show it another way."),
    Q("n45","\"We already own a timeshare.\" Which reply reframes it?","\"Then you know a good vacation matters. This is a hotel.\"",["\"Timeshares are a bad deal, folks. You should sell it.\"","\"Then I'm sorry, folks, you can't come with us tomorrow.\"","\"Don't worry about that, it doesn't matter at all.\""],"Turn it into common ground, then lead."),
    Q("n46","\"We don't want to commit to anything.\" Best reply?","\"Good: there's no obligation to book or buy.\"",["\"You'll have to commit to a little bit, though.\"","\"Don't worry, everyone commits in the end, folks.\"","\"Then this really isn't for you two, sorry.\""],"True, it's in the pitch deck, and it takes away the fear."),
    Q("n47","\"We have plans tomorrow.\" Best reply?","\"What time? We start at 8 and you're done by 11.\"",["\"Can't you just cancel your plans for us tomorrow, folks?\"","\"Don't worry, it only takes about 30 minutes, tops.\"","\"Then come back next year instead, no problem at all.\""],"Ask the time first. They need 3 free hours from 8, with nothing paid booked."),
    MATCH("n48","Match each objection to a reframe",[["\"We own a timeshare\"","You know vacations matter"],["\"We don't want to commit\"","No obligation to buy"],["\"We have plans\"","Ask the time: 8 to 11"],["\"Sounds like a scam\"","Come see it yourself"]],"Agree with the feeling, then give it a new meaning."),
    Q("n49","When should you let a couple go?","When it's really not for them",["Never, keep pushing","When they ask about breakfast","When they give their number"],"A solid no beats a fake yes. Let them go with a smile.")
  ]
},
{
  id: "st2", name: "Stop them", sub: "Read people, open the talk", icon: "hand",
  notes: [
    { h: "Most people keep walking", li: [
      "Most people you greet keep walking. That's normal, and it isn't about you. Smile and greet the next couple.",
      "Greet everyone, and don't judge by looks. The small talk tells you who qualifies." ] },
    { h: "Read them as they come", li: [
      "Look for something real: a team cap, a hotel bracelet, kids, a map in hand.",
      "Pick your opener before they reach you." ] },
    { h: "Open with them, not the offer", li: [
      "Say something real about them, or offer help: \"Go Steelers! Where are you guys from?\" \"Looking for something? I know the area.\"",
      "A sincere compliment works too: a hat, a bag, a cute kid. Never flirty.",
      "Celebrating something? \"Congratulations! How nice that you chose Aruba for it.\"",
      "Don't open with free stuff. It sounds like a scam." ] },
    { h: "Be ready", li: [
      "Know the beaches, restaurants and shops around you. Helping people builds trust fast.",
      "Have a pen and invitations in hand, and your uniform and name tag on.",
      "Have a few openers ready, and say them out loud until they sound like you." ] },
    { h: "Where this comes from", li: [
      "Ideas from the Timeshare OPC University videos and from Suzanne R. Angeles's audiobook \"How To Become A Booking Timeshare Marketing OPC\" (OPC Secrets By Suz), put in our own words and fitted to Iberostar's rules and the Open House." ],
      src: [{ label: "Timeshare OPC University on YouTube", url: "https://www.youtube.com/@timeshareopcuniversity2290" },
            { label: "OPC Secrets By Suz on YouTube", url: "https://www.youtube.com/watch?v=BzTAhkKYrWg" }] }
  ],
  qs: [
    Q("st1a","Most people you greet keep walking. What does that mean?","It's normal. Greet the next person",["Your pitch is wrong. Stop for today","Move to a busier spot right away","Ask your manager for a new script"],"Most people say no. The more people you greet, the more you book."),
    Q("st2a","A couple walks toward you. When do you pick your opener?","Before they reach you, from what you see",["Once they stop and say hello to you","After they ask you what you're selling","Never. I say the same line to everyone"],"Read them as they come: caps, bracelets, kids, maps. Then pick your opener."),
    Q("st2b","He wears a Pittsburgh Steelers cap. What's a good opener?","\"Go Steelers! Where are you guys from?\"",["\"Hi! Free breakfast and a gift for you!\"","\"Excuse me, do you have a minute?\"","\"Are you interested in a promotion?\""],"Open with something real about them and a question they enjoy answering."),
    Q("st2g","Someone is reading street signs. What's a good way in?","Offer help: \"Looking for something?\"",["Tell them about the gift right away","Ask how old they are and if they work","Let them go. Lost people never stop"],"Help first. A lost tourist is glad to meet someone who knows the area."),
    BUILD("bs3","Build a friendly opener.","Go Steelers! Where are you guys from?",["Free","gift"],"Something real about them, then a question they enjoy answering."),
    Q("st2i","Which compliment works best?","A sincere one about something they chose",["A flirty one, to make them both laugh","One about how young they both look","None. Compliments always sound fake"],"A real compliment about their hat, bag or kids stops people. Never flirty."),
    Q("st2j","They say they're here for their anniversary. What do you say?","\"Congratulations! You chose Aruba for it!\"",["\"Great, then you need our free gift.\"","\"Okay. Are you two over 32 years old?\"","\"Nice. Do you have a credit card?\""],"Share the moment first. The pitch can wait a few seconds."),
    Q("st1j","A couple looks like they couldn't afford a vacation. What do you do?","Greet them like everyone else",["Let them pass. Save your energy","Ask them first what they earn","Give them the short version only"],"Don't judge by looks. The small talk tells you who qualifies."),
    Q("st1g","Why learn the beaches, shops and restaurants around you?","Helping people builds trust fast",["So you can talk about Aruba instead","To show them you know more than they do","Guests only stop for directions"],"Help first. Trust comes before every booking."),
    Q("st1e","A couple says yes. What should already be in your hand?","A pen and an invitation",["Your phone, to look up the rules","A flyer, to read the offer from","Nothing. You'll find a pen later"],"Be ready the second they say yes. Fumbling for a pen costs you trust.")
  ]
},
{
  id: "st3", name: "Small talk", sub: "Break the ice, qualify as you go", icon: "talk",
  notes: [
    { h: "Give first, then ask", li: [
      "While you help (directions, a tip, a good restaurant), ask about them: where they're from, first time in Aruba, what they've liked so far.",
      "Ask, listen, share something, then ask the next question. A chat, never an interview.",
      "People don't care how much you know until they know how much you care." ] },
    { h: "Qualify inside the small talk", li: [
      "\"Where are you from? Where are you staying? When do you fly home?\" These fit any friendly chat.",
      "Work: \"What do you guys do back home?\"",
      "Age: with older couples, \"Are you retired yet, or still working?\" often opens it up.",
      "Recent tour: \"Have you been to an Iberostar breakfast before?\"",
      "Card: check which card they have when you go over what to bring." ] },
    { h: "Tie the gift to what they love", li: [
      "Find out what they enjoy: a great dinner, a tour, shopping, golf.",
      "Then make the gift real for them: their IberoCash works at partners like Gianni's, Daniel's Steak & Chop or Rocka Beach Tours.",
      "Only promise what the invitation really gives, and only tell stories that really happened." ] },
    { h: "If they don't qualify", li: [
      "Let them go with a smile and wish them a great trip.",
      "Never ask anyone to bend the truth to qualify. It comes out at the hostess desk anyway." ] },
    { h: "Where this comes from", li: [
      "Ideas from the Timeshare OPC University videos and from Suzanne R. Angeles's audiobook \"How To Become A Booking Timeshare Marketing OPC\" (OPC Secrets By Suz), put in our own words and fitted to Iberostar's rules and the Open House." ],
      src: [{ label: "Timeshare OPC University on YouTube", url: "https://www.youtube.com/@timeshareopcuniversity2290" },
            { label: "OPC Secrets By Suz on YouTube", url: "https://www.youtube.com/watch?v=BzTAhkKYrWg" }] }
  ],
  qs: [
    Q("st3a","When do you ask about them?","While you help with directions or tips",["Only after they have agreed to come","Before you say anything else at all","Never. Personal questions scare people"],"Give first, then ask. It feels like a chat, not an interview."),
    Q("st3b","Which way of asking about work feels friendly?","\"What do you guys do back home?\"",["\"Are you employed? What's your job?\"","\"Do you earn enough to qualify?\"","\"Tell me your job title and salary.\""],"A friendly question gets a friendly answer, and tells you if they work."),
    Q("st3c","An older couple. What's an easy way into their ages?","\"Are you retired yet, or still working?\"",["\"How old are you both, exactly?\"","\"You two look over seventy, right?\"","\"Can we see your IDs, for your ages?\""],"Retirement opens the topic. Then you can ask how long ago, or how long to go."),
    Q("st3d","What should small talk never feel like?","An interview, one question after another",["A friendly chat between new friends","A conversation about their vacation","A talk where they ask you questions"],"Ask, listen, share something, then ask the next question."),
    Q("st3e","They're from Venezuela, and they love the offer. What now?","Let them go nicely. They don't qualify",["Write it up and hope no one checks","Ask them to say they're from Colombia","Book them for 10 instead of 8"],"Venezuela is one of the five countries left out. Wish them a great trip."),
    Q("st3f","Why never ask a guest to bend the truth to qualify?","It comes out at the hostess desk anyway",["Guests always refuse to do it anyway","It only works for Canadian couples","The gift is the same either way"],"Guests show IDs and a card at check-in. Honest bookings are the only ones that count."),
    LINE("st3h","People don't care how much you know until they know how much you ___.","care",["earn","sell","talk"],"Show you care about them first. Then they listen."),
    Q("st3i","They love a good steak. How do you make the gift feel real?","Tie the IberoCash to a steakhouse partner",["Say the gift is worth a lot of money","Skip the gift and talk about the room","Promise them a free steak dinner"],"Daniel's Steak & Chop is a partner. Show them how the gift fits what they love."),
    Q("st3j","When can you tell a story about another couple?","Only when it really happened",["Whenever it helps to get a yes","Only with the skeptical couples","Never. Stories sound like lies"],"True stories build trust. Made-up ones break it.")
  ]
},
{
  id: "st4", name: "Objections and the close", sub: "Welcome objections, button it up", icon: "shield",
  notes: [
    { h: "An objection is a test", li: [
      "Most objections mean \"tell me more\" or \"show me I can trust you.\"",
      "Welcome it: \"Great question.\" Then answer with the plain truth.",
      "Couldn't answer one? Write it down, work out an answer at home, and bring it to the team meeting." ] },
    { h: "\"Let me think about it\"", li: [
      "It usually means they can't picture the morning yet.",
      "Paint it again: breakfast at one of our five-star restaurants, the tour, one of our rooms, and IberoCash for a dinner out.",
      "Be specific: what's included, where, when and how long." ] },
    { h: "Never lie to get a yes", li: [
      "Don't hide the presentation, the 90 minutes or what to bring. Guests remember what you said.",
      "No pressure and no tricks. Guests who feel pushed or fooled don't show up." ] },
    { h: "Button it up", li: [
      "Before they go, go over it once more: where, what time, what to bring (2 IDs each, one credit card) and the call between 5 and 6.",
      "End warm: \"See you tomorrow at 8. Enjoy your day!\"" ] },
    { h: "Where this comes from", li: [
      "Ideas from the Timeshare OPC University videos and from Suzanne R. Angeles's audiobook \"How To Become A Booking Timeshare Marketing OPC\" (OPC Secrets By Suz), put in our own words and fitted to Iberostar's rules and the Open House." ],
      src: [{ label: "Timeshare OPC University on YouTube", url: "https://www.youtube.com/@timeshareopcuniversity2290" },
            { label: "OPC Secrets By Suz on YouTube", url: "https://www.youtube.com/watch?v=BzTAhkKYrWg" }] }
  ],
  qs: [
    Q("st4a","A guest raises an objection. What is it, most of the time?","A test: \"tell me more, can I trust you?\"",["A firm no. Thank them and move on","A sign your pitch went on too long","A trick to get a bigger gift from you"],"Most objections ask for more information. Welcome them."),
    Q("st4b","What do you say first when you hear an objection?","\"Great question.\" Then the plain truth",["\"That's not true at all, trust me.\"","\"Everyone says that. It's nothing.\"","\"Let me get my manager to explain.\""],"Welcome it, then answer honestly."),
    Q("st4c","Why never say \"it's not a presentation\" to get a yes?","They find out, and they shut down",["It makes the gift a lot smaller","Hostesses don't allow that word","Guests prefer longer presentations"],"Guests remember what you said. One lie and they stop listening."),
    Q("st4d","They say \"Let me think about it.\" What does it usually mean?","They can't picture the morning yet",["They've already decided not to come","They want you to raise the gift","They need to check with their kids"],"Go back and paint the picture: breakfast, the tour, a room, the IberoCash."),
    Q("st4e","How do you make the morning easy to picture?","Be specific: what, where, when, how long",["Repeat \"it's free\" a few more times","Say \"it's amazing\" over and over again","Talk faster so they hear every detail"],"People say yes to what they can see in their heads."),
    Q("st4f","You couldn't answer an objection today. What now?","Write it down and work out an answer",["Forget it. That couple was never coming","Avoid couples who look like that one","Blame the offer and ask for a new one"],"Your objection notebook turns today's no into tomorrow's yes."),
    Q("st4j","They're booked and leaving. What do you go over before they go?","Where, when, what to bring, the call",["Only the gift they'll get tomorrow","Nothing. They can ask the hostess","The rules for getting a bigger gift"],"Button it up: the place, the time, 2 IDs each and one card, and the confirmation call.")
  ]
},
{ id: "final", name: "Final run", sub: "Everything mixed: 20 in a row", icon: "trophy", final: true, count: 20, notes: [] }
];

/* NLP practice lines for Say it, taken from the guidebook notes that have a sayId.
   They're new lines, so there's no recording to play. */
const NLP_LINES = Object.fromEntries(LEVELS.flatMap(L => (L.notes || []).filter(n => n.sayId).map(n => [n.sayId, { id: n.sayId, text: n.say }])));
