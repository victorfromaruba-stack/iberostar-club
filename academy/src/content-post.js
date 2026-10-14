/* The pitch, in order. Step 6 is going over the plan at the end, once the invitation is written. */
const MAP_STEPS = [
  { t: "Say why you're inviting them", line: "\"We're inviting families to come see the newest hotel on the island, so next time you travel you'll want to stay with us.\"" },
  { t: "Share the good news", line: "\"Breakfast at one of our five-star restaurants, a personal tour, one of our rooms, and a reward for your time.\"" },
  { t: "Offer the invitation", line: "\"Let me get you an invitation.\"" },
  { t: "Book the time", line: "\"Let me put you down for 8 o'clock.\"" },
  { t: "Write slowly, get the number", line: "\"We also do confirmation calls, between 5 and 6, just to see if you're still able to make it.\"" },
  { t: "Go over the plan", line: "\"Between the breakfast, the property tour and a little information about the club, we only ask families for 90 minutes.\"" },
  { t: "Lock in the show-up", line: "\"So we see you guys tomorrow at 8 for sure?\"" }
];

/* What to say: the exact words from the voice notes, step by step.
   clip/from/to point at sentences in CLIPS, so every line plays from the recording.
   nlp names the NLP move a line uses (taught in the NLP unit). */
const SCRIPT = [
  { step: "Say why you're inviting them", tip: "Lead with why you're inviting them. Then the gift makes sense.",
    dont: { text: "Have you been to Eagle Beach yet? We're promoting Iberostar. We're going to give you free breakfast and $200.", clip: "02", from: 7, to: 9,
            why: "Gift first sounds like a scam, not true, or timeshare. They run away." },
    lines: [
      { id: "s1a", nlp: "Because", clip: "02", from: 12, to: 13, text: "Yes, folks, I'm part of the exciting team that's inviting families to the newest hotel on the island to come and take a peek, to have a nice branding experience. Once you've seen it, hopefully next time you travel, you'll want to stay with us." },
      { id: "s1b", clip: "02", from: 19, to: 24, text: "Yes, folks, we're inviting as many people as we can to come and see our beautiful hotel. So next time you travel, you'll consider staying with us. After you see it, we know you're going to want to stay with us. And it also helps us spread the word. You'll tell family and friends about it and maybe take a picture, put it on Facebook, Instagram. It's all good marketing for us." } ] },
  { step: "Share the good news", tip: "Breakfast, the tour, a room, then the thank-you. Make it personal with what you see.",
    lines: [
      { id: "s2a", clip: "03", from: 1, to: 2, text: "It's an amazing promotion. We're actually inviting families for a full branding experience, not just a quick look at the hotel." },
      { id: "s2b", nlp: "Future pacing", clip: "03", from: 3, to: 4, text: "When you arrive, we treat you to breakfast at one of our five-star restaurants. We know you're going to love it." },
      { id: "s2c", nlp: "Pace and lead", clip: "03", from: 5, to: 8, text: "I see you have a bracelet from Riu. I'm sure you're eating breakfast at the same place every day. You're going to love our place. It's something new, something different for you.", note: "Use what you see: their bracelet, their hotel." },
      { id: "s2d", clip: "03", from: 9, to: 9, text: "After breakfast, they're going to give you a personalized tour of the property, so you can see for yourself the quality of the facilities and also the service." },
      { id: "s2e", nlp: "Future pacing", clip: "03", from: 10, to: 10, text: "And of course, they'll share with you one of our rooms, so you'll be able to anticipate the quality that you'll receive when you stay with us." },
      { id: "s2f", clip: "03", from: 11, to: 12, text: "And the best part is, we also reward you for your time as a way of saying thanks. We can offer you $100 in IberoCash that you can use at all the best restaurants and activity companies on the island: dining, shopping, activities.", note: "Offer the gift their invitation shows. $100 is the trainer's example." },
      { id: "s2g", clip: "03", from: 13, to: 15, text: "We work with Gianni's. We work with Screaming Eagle, Daniel's Steakhouse, just to name a few. We partner with all the best companies on the island because everybody wants to be associated with Iberostar." },
      { id: "s2h", clip: "03", from: 16, to: 19, text: "We own the Tierra del Sol golf course and community. We opened our first hotel a year and a half ago. We have two more coming. We have invested a lot in the island and we want to get the word out." } ] },
  { step: "Offer the invitation", tip: "Don't ask if they want one. Say it. Their objections come out now, and you can work them.",
    lines: [
      { id: "s3a", nlp: "Assume the yes", clip: "04", from: 1, to: 1, text: "Let me get you an invitation.", note: "Not \"Would you like one?\"" } ],
    extra: { label: "Hear the objections you can work", clip: "04", from: 4, to: 10,
             text: "Already own timeshare, don't want to commit, plans tomorrow: all of these can be worked. Only \"we're leaving tomorrow morning\" can't." } },
  { step: "Book the time", tip: "Start at 8. If it's too early for them, offer 10.",
    lines: [
      { id: "s4a", nlp: "Two yeses", clip: "05", from: 0, to: 1, text: "Let me put you down for 8 o'clock.", note: "Too early? Then offer 10 o'clock." } ] },
  { step: "Write slowly, get the number", tip: "While you write, they stay. Make a friend and ask small questions. Then ask for the number, and say why.",
    lines: [
      { id: "s5a", nlp: "Because", clip: "06", from: 7, to: 11, text: "Folks, we also do confirmation calls with our guests. If you want to give me your phone number, maybe you have WhatsApp on your phone. That way, one of my managers or supervisors can reach out to you this afternoon between like 5 and 6 o'clock simply to ask you if you're still able to make it. We're not allowed to solicit or anything like that. It's just to be able to see if you're still able to make it." } ],
    extra: { label: "Hear why you slow down", clip: "05", from: 3, to: 14,
             text: "One family in 100 walks away while you write. If they like you, trust you and believe you, they buy from you." } },
  { step: "Go over the plan", tip: "Bring the invitation. Say what it really is: a hotel with a club, not timeshare. Say 90 minutes.",
    dont: { text: "Breakfast is 45 minutes, property tour is 15 minutes…", clip: "08", from: 4, to: 5,
            why: "They think it's only 45 minutes, then the hostess says 90. Never mention minutes." },
    lines: [
      { id: "s6a", clip: "05", from: 15, to: 15, text: "Folks, make sure to bring this invitation with you to confirm which gift you are offered." },
      { id: "s6b", nlp: "Pre-frame", clip: "05", from: 16, to: 19, text: "When you get there, it's a nice breakfast at one of our restaurants, quick little tour of the property. We're not selling timeshare. We don't have any weeks or points or maintenance fees, nothing like that. We're a full-service hotel that you can book direct through travel agents, through Expedia. But everybody who passes through, we also show you how you can book direct through our loyalty club for preferred rates and cool perks when you travel." },
      { id: "s6c", nlp: "Pre-frame", clip: "05", from: 21, to: 25, text: "To be clear, there's no obligation to be a member to stay there. We're just like Hyatt, just like Hilton, full-service hotel. But our members do enjoy significant discounts and really cool perks when they travel. So if you see something you like in the membership, they'll be happy to show you how to get involved. If it's not something for you, we still love you anyways, because we want you staying at our hotel." },
      { id: "s6d", nlp: "Simple, never false", clip: "08", from: 0, to: 0, text: "And guys, between the breakfast, the property tour, and a little information about the club, we only ask families for 90 minutes, and breakfast tends to eat about half of that." } ] },
  { step: "Lock in the show-up", tip: "Don't just say have a nice day. Ask again and take their temperature. A solid no beats a fake yes.",
    lines: [
      { id: "s7a", nlp: "Tag question", clip: "07", from: 1, to: 1, text: "So we see you guys tomorrow at 8 for sure?" },
      { id: "s7b", nlp: "Read the real answer", clip: "07", from: 4, to: 4, text: "Sorry if I misunderstood, but I thought you were pretty sure you were coming.", note: "When they say \"we'll try\" or \"we'll see\"." },
      { id: "s7c", clip: "07", from: 8, to: 10, text: "You know, a lot of families are interested in coming for our open house promotion. And we certainly wouldn't want to block a space for someone who's sure they want to come if you're not sure you're going to make it. So tell me, guys, are we going to see you tomorrow at 8?" },
      { id: "s7d", clip: "07", from: 15, to: 16, text: "You know what, guys, maybe I should give this invitation to somebody else. I wouldn't want to hold up a space for another family if you're not sure you're going to make it.", note: "Still unsure? Offer it to another family." },
      { id: "s7e", clip: "07", from: 25, to: 27, text: "Listen, this nice young man gets a little $65 bonus on his paycheck just for you showing up. You don't have to book or buy anything. I know he would greatly appreciate it.", note: "About yourself: \"I get a little $65 bonus just for you showing up.\"" } ] }
];
const SCRIPT_LINES = Object.fromEntries(SCRIPT.flatMap(s => s.lines).map(l => [l.id, l]));

/* The nine voice notes. Segment times are in seconds. */
const CLIPS = /*CLIPS*/[]/*CLIPS-END*/;

/* ---------- Scenario generator (Who qualifies? and Lightning) ---------- */
const GRADE = { Q: "Q (full gift)", CT: "CT (half gift)", NQ: "NQ (no gift)" };
const pick = a => a[Math.floor(Math.random() * a.length)];
function bandUSA(a){ return a>=32&&a<=70 ? "Q" : (a>=28&&a<=31)||a>=71 ? "CT" : "NQ"; }
function bandLat(a){ return a>=40&&a<=60 ? "Q" : "NQ"; }
function bandArg(a){ return a>=45&&a<=55 ? "Q" : (a>=35&&a<=44)||(a>=56&&a<=70) ? "CT" : "NQ"; }
/* Her age. When his band isn't Q, keep her in the same band so the answer never depends on whose age counts for CT. */
function herAge(his, band){
  const offs = shuffle([-6,-4,-3,-2,-1,0,1,2,3,5]);
  for (const o of offs){ const h = Math.max(22, his + o); if (band(his) === "Q" || band(h) === band(his)) return h; }
  return his;
}
const tag = (from, his, her, together, work, card, stay) =>
  [["pin", from], ["cake", `He's ${his} · she's ${her}`], ["ring", together], ["briefcase", work], ["card", card], ["bed", stay]];
function genScenario(){
  const r = Math.random();
  if (r < 0.4){
    const from = pick(["Texas","Ohio","New Jersey","Florida","Ontario, Canada","New York","Illinois","Quebec, Canada","Pennsylvania","Alberta, Canada"]);
    const his = pick([24,26,27,28,29,30,31,32,33,38,47,58,66,69,70,71,72,74,78]), her = herAge(his, bandUSA);
    const card = pick(["Visa","Mastercard","Amex","Discover"]);
    const job = his >= 66 ? "Both retired" : "He works";
    const g = bandUSA(his);
    return { q:`Married couple from ${from}. He's ${his}, she's ${her}. ${job}, they have a ${card}, and they paid for their hotel.`,
      chips: tag(from, his, her, "Married", job, card, "Paid hotel"),
      g, why:`USA and Canada: the man's age counts. ${his} is ${g==="Q" ? "in 32 to 70, so the full gift (Q)" : g==="CT" ? (his >= 71 ? "71 or older, so the half gift (CT)" : "in 28 to 31, so the half gift (CT)") : "under 28, so no gift (NQ)"}.` };
  }
  if (r < 0.65){
    const from = pick(["Colombia","Mexico","Peru","Chile","Brazil","Costa Rica","Panama","the Dominican Republic","Guatemala"]);
    const his = pick([36,38,39,40,41,48,55,59,60,61,63]), her = herAge(his, bandLat);
    const card = pick(["Visa","Mastercard","Amex"]);
    const g = bandLat(his);
    return { q:`Couple living together, from ${from}. He's ${his}, she's ${her}. Both work, they have a ${card}, paying for their hotel.`,
      chips: tag(from.replace(/^the /, ""), his, her, "Living together", "Both work", card, "Paid hotel"),
      g, why:`Latin America and Caribbean: only 40 to 60 gets the full gift, and there's no half gift. ${his} is ${g==="Q" ? "in range, so Q" : "out of range, so NQ"}.` };
  }
  if (r < 0.85){
    const his = pick([33,35,40,44,45,50,55,56,62,70,72]), her = herAge(his, bandArg);
    const g = bandArg(his);
    return { q:`Married couple from Argentina. He's ${his}, she's ${her}. He works, they have a Mastercard, paying for their rental.`,
      chips: tag("Argentina", his, her, "Married", "He works", "Mastercard", "Paid rental"),
      g, why:`Argentina: 45 to 55 is Q, 35 to 44 and 56 to 70 are CT, any other age is NQ. ${his} is ${g}.` };
  }
  const from = pick(["Venezuela","Ecuador","Haiti","Cuba"]);
  const his = pick([42,46,50,55,58]), her = herAge(his, bandLat);
  return { q:`Married couple from ${from}. He's ${his}, she's ${her}. Both work, Visa card, paying for their hotel.`,
    chips: tag(from, his, her, "Married", "Both work", "Visa", "Paid hotel"),
    g:"NQ", why:`${from} isn't covered by the Latin America and Caribbean rules, so no gift (NQ) at any age.` };
}
const FIXED_SCEN = [
  ["Single woman from the USA, 52. She works, has a Visa, and is paying for her hotel.","Q","Single women from the USA, 40 to 65, get the full gift."],
  ["Single woman from Canada, 52. She works, has a Visa, and is paying for her hotel.","NQ","Single women qualify only from the USA."],
  ["Single man from the USA, 45. He works, has an Amex, and is paying for his hotel.","NQ","Only single women can qualify, and only from the USA."],
  ["Couple from the USA, both 45. They're staying free at a friend's condo.","NQ","They must be paying for where they stay."],
  ["Couple from the USA, both 50. He's an active-duty Marine.","NQ","Active US military get no gift."],
  ["Couple from the USA, both 50. He's in the National Guard. Visa, paying for their hotel.","Q","The National Guard is OK, and 50 is in 32 to 70."],
  ["Couple from the USA, both 44. She's a flight attendant for a US airline.","NQ","Airline pilots and crew get no gift."],
  ["Couple from Mexico, both 50. Both work. Their only card is a Discover.","NQ","Latin America and Caribbean needs Visa, Mastercard or Amex."],
  ["Couple from the USA. He's 69, she's 72. Retired, Amex, paying for their hotel.","Q","The man's age counts: 69 is in 32 to 70."],
  ["Couple from the USA. He's 72, she's 65. Retired, Visa, paying for their timeshare.","CT","The man's age counts: 72 is 71 or older, so the half gift."],
  ["Same-sex couple from Chicago, 45 and 52. Both work, Visa, paying for their hotel.","Q","Either partner's age counts, and both are in 32 to 70."],
  ["Three couples from Boston traveling together, all in their 40s.","NQ","Three couples or more together (Trinella or Trifecta) get no gift."],
  ["Couple from the USA, both 40. He speaks only English, she speaks only Spanish.","NQ","Both must be fluent in the same language."],
  ["Couple from Canada, both 55. They toured Iberostar in-house 4 months ago.","NQ","An in-house tour in the last 6 months means no gift."],
  ["Couple from the USA, both 48. He works at a Marriott vacation club resort.","NQ","People who work for hotels, timeshares or vacation clubs get no gift."],
  ["Iberostar The Club member staying in a rental condo, with IDs and a card.","Q","The GI team may invite members staying off property. With IDs and a card, they're Q."]
];
function scenarioQ(s, id){
  const opts = ["Q","CT","NQ"].map(k => GRADE[k]);
  return { id, q:s.q, chips:s.chips, a:GRADE[s.g], g:s.g, w:opts.filter(o => o !== GRADE[s.g]), why:s.why, fixed:opts, scen:true };
}
function fixedScen(f){ return scenarioQ({ q:f[0], g:f[1], why:f[2] }, "fx" + FIXED_SCEN.indexOf(f)); }
function buildScenarios(n){
  const out = shuffle(FIXED_SCEN.slice()).slice(0, Math.round(n/3)).map(fixedScen);
  const seen = new Set(out.map(o => o.q));
  let guard = 0;
  while (out.length < n && guard++ < 500){ const s = genScenario(); if (seen.has(s.q)) continue; seen.add(s.q); out.push(scenarioQ(s, "gen")); }
  return shuffle(out);
}
