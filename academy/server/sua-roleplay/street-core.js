/* =====================================================================
   STREET PRACTICE ENGINE (shared)
   The couples, their rules, the prompts and the feedback format for Street practice.
   One plain script used three ways: in the app (the Claude version asks Claude on the
   viewer's own account), in the sua-roleplay Edge Function (paid API path), and in tests.
   It sets globalThis.RPCORE and touches nothing else.
   Couples are graded by the same rules the lessons teach (qualifications PDF, 2 March 2026).
   ===================================================================== */
globalThis.RPCORE = (() => {
  const FOCUS = ["any", "friendly", "skeptical", "hurry", "brush", "objections", "nq"];
  const MOOD_LABEL = { friendly: "Friendly", chatty: "Chatty", skeptical: "Skeptical", hurry: "In a hurry", brush: "Didn't want to talk", split: "One keen, one not" };

  /* ---------- random helpers (seedable for tests) ---------- */
  function seeded(seed){
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pickR = (r, a) => a[Math.floor(r() * a.length)];
  const intR = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  function weighted(r, pairs){
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let x = r() * total;
    for (const [v, w] of pairs){ if ((x -= w) < 0) return v; }
    return pairs[pairs.length - 1][0];
  }
  const cap = s => s.replace(/^the /, "The ");

  /* ---------- the rules: the man's age counts; in a same-sex couple, either partner's ---------- */
  const bandUSA = a => a >= 32 && a <= 70 ? "Q" : (a >= 28 && a <= 31) || a >= 71 ? "CT" : "NQ";
  const bandLat = a => a >= 40 && a <= 60 ? "Q" : "NQ";
  const bandArg = a => a >= 45 && a <= 55 ? "Q" : (a >= 35 && a <= 44) || (a >= 56 && a <= 70) ? "CT" : "NQ";
  const RANK = { NQ: 0, CT: 1, Q: 2 };
  const FLAG_WHY = {
    crew: "Airline pilots and crew, like flight attendants, get no gift.",
    military: "Active US military get no gift. (The National Guard is OK.)",
    industry: "People who work for hotel, timeshare or vacation club companies get no gift.",
    agent: "Travel agents and tour operators get no gift.",
    toured: "An Iberostar tour in the last 6 months (in-house) or 12 months (street program) means no gift.",
    trio: "Three couples or more traveling together (Trinella or Trifecta) get no gift."
  };

  /* The grade from the facts alone. The generator's intended grade must always match it. */
  function rules(f, people){
    if (f.flag) return { g: "NQ", why: FLAG_WHY[f.flag] };
    if (f.stayKind === "cruise") return { g: "NQ", why: "They're on a cruise ship, not paying for a hotel, timeshare or rental here, and they sail tonight." };
    if (f.stayKind === "free") return { g: "NQ", why: "They must be paying for where they stay. Staying free with family or friends: no gift." };
    if (f.region === "aw" || f.stayKind === "home") return { g: "NQ", why: "They live in Aruba, one of the five countries left out (Aruba, Cuba, Venezuela, Haiti and Ecuador)." };
    if (f.region === "out") return { g: "NQ", why: `${cap(f.country)} is one of the five countries left out: Aruba, Cuba, Venezuela, Haiti and Ecuador. No gift at any age.` };
    if (f.region === "eu") return { g: "NQ", why: "Only the USA and Canada, Argentina, and Central and South America and the Caribbean qualify. Europeans get no gift." };
    if (!f.sameLang) return { g: "NQ", why: "Both must be fluent in the same language: both English, or both Spanish." };
    if (!f.working && !f.retired) return { g: "NQ", why: "One of them must work (or, for the USA and Canada, be retired)." };
    if (f.together === "single"){
      const p = people[0];
      if (f.region === "us" && p.sex === "f" && p.age >= 40 && p.age <= 65 && f.card !== "debit")
        return { g: "Q", why: `Single women from the USA, 40 to 65, get the full gift. She's ${p.age}.` };
      if (p.sex === "m") return { g: "NQ", why: "Only single women can qualify, and only from the USA." };
      if (f.region !== "us") return { g: "NQ", why: "Single women qualify only from the USA." };
      return { g: "NQ", why: `Single women from the USA qualify from 40 to 65. She's ${p.age}.` };
    }
    const men = people.filter(p => p.sex === "m");
    const sameSex = men.length !== 1;
    if (f.region === "us" || f.region === "ca"){
      const best = sameSex ? people.reduce((b, p) => RANK[bandUSA(p.age)] > RANK[bandUSA(b.age)] ? p : b) : men[0];
      const g = bandUSA(best.age);
      const who = sameSex ? `In a same-sex couple, either partner's age counts. ${best.name} is ${best.age}` : `USA and Canada: the man's age counts. He's ${best.age}`;
      if (g === "NQ") return { g, why: `${who}, under 28, so no gift (NQ).` };
      if (g === "Q" && f.card === "debit") return { g: "NQ", why: "The full gift needs a credit card: Visa, Mastercard, Amex or Discover." };
      if (g === "Q") return { g, why: `${who}, between 32 and 70, so the full gift (Q).` };
      return { g, why: `${who}, ${best.age >= 71 ? "71 or older" : "between 28 and 31"}, so the half gift (CT).${f.card === "debit" ? " A debit card is OK for CT." : ""}` };
    }
    const band = f.region === "ar" ? bandArg : bandLat;
    const man = sameSex ? people.reduce((b, p) => RANK[band(p.age)] > RANK[band(b.age)] ? p : b) : men[0];
    if (!f.working) return { g: "NQ", why: "Outside the USA and Canada, one of them must work. Retirees get no gift." };
    if (f.card === "Discover" || f.card === "debit") return { g: "NQ", why: "Outside the USA and Canada, the card must be Visa, Mastercard or Amex. No Discover." };
    if (f.region === "ar"){
      const g = bandArg(man.age);
      return { g, why: `Argentina: 45 to 55 is Q, 35 to 44 and 56 to 70 are CT, any other age is NQ. He's ${man.age}, so ${g === "Q" ? "the full gift (Q)" : g === "CT" ? "the half gift (CT)" : "no gift (NQ)"}.` };
    }
    const g = bandLat(man.age);
    return { g, why: `${cap(f.country)}: only 40 to 60 gets the full gift, and there's no half gift. He's ${man.age}, so ${g === "Q" ? "the full gift (Q)" : "no gift (NQ)"}.` };
  }

  /* ---------- people, places and things ---------- */
  const NAMES = {
    us: { m: ["Mike","Dave","Steve","Brian","Jason","Tom","Kevin","Mark","Greg","Rob","Chris","Jeff","Matt","Paul","Scott","Eric"],
          f: ["Linda","Karen","Amy","Lisa","Jen","Michelle","Sarah","Kim","Nicole","Donna","Laura","Beth","Megan","Tracy","Heather","Julie"] },
    lat: { m: ["Carlos","Andrés","Javier","Luis","Diego","Alejandro","Jorge","Ricardo","Fernando","Miguel"],
           f: ["María","Paola","Carolina","Lucía","Daniela","Valentina","Gabriela","Fernanda","Camila","Sofía"] },
    ar: { m: ["Martín","Facundo","Gonzalo","Pablo","Nicolás"], f: ["Florencia","Agustina","Romina","Julieta","Natalia"] },
    eu: { m: ["Jeroen","Bas","Sander","Jens","Tobias","Gareth"], f: ["Sanne","Femke","Anouk","Katrin","Anja","Claire"] },
    aw: { m: ["Ricky","Glenn","Ruben","Junior"], f: ["Giselle","Shirley","Natasha","Jacqueline"] }
  };
  const HOMES = {
    us: [["Columbus, Ohio","He wears an Ohio State cap."],["Houston, Texas","He wears a Texas Longhorns T-shirt."],["Newark, New Jersey","He wears a Giants cap."],
         ["Tampa, Florida","He wears a Buccaneers cap."],["Buffalo, New York","He wears a Buffalo Bills cap."],["Chicago, Illinois","He wears a Cubs cap."],
         ["Pittsburgh, Pennsylvania","He wears a Steelers T-shirt."],["Boston, Massachusetts","He wears a Red Sox cap."],["Charlotte, North Carolina","He wears a Panthers cap."],
         ["Atlanta, Georgia","He wears a Braves cap."],["Denver, Colorado","He wears a Broncos T-shirt."],["Detroit, Michigan","He wears a Tigers cap."]],
    ca: [["Toronto, Ontario","He wears a Maple Leafs cap."],["Calgary, Alberta","He wears a Calgary Flames T-shirt."],["Vancouver, British Columbia","He wears a Canucks cap."],
         ["Ottawa, Ontario","There's a small Canadian flag on his backpack."],["Halifax, Nova Scotia","There's a small Canadian flag on his backpack."]]
  };
  const LAT = [["Monterrey","Mexico"],["Guadalajara","Mexico"],["Mexico City","Mexico"],["Bogotá","Colombia"],["Medellín","Colombia"],
               ["Lima","Peru"],["Santiago","Chile"],["San José","Costa Rica"],["Panama City","Panama"],["Santo Domingo","the Dominican Republic"],
               ["Guatemala City","Guatemala"],["Montevideo","Uruguay"]];
  const ARG = ["Buenos Aires","Córdoba","Rosario","Mendoza"];
  const OUT = [["Caracas","Venezuela"],["Maracaibo","Venezuela"],["Quito","Ecuador"],["Guayaquil","Ecuador"],["Havana","Cuba"]];
  const EU = [["Amsterdam","the Netherlands","Dutch"],["Utrecht","the Netherlands","Dutch"],["Munich","Germany","German"],["Manchester","England","English"]];
  const AW = ["Noord","Santa Cruz","San Nicolas","Paradera"];
  const JOBS_US = ["a sales manager","a nurse","a teacher","an electrician","an accountant","a dental hygienist","a police officer","a real estate agent",
                   "a software developer","owns a landscaping business","an HR manager","a pharmacist","a firefighter","a truck driver","an insurance agent","a physical therapist"];
  const JOBS_LAT = ["an engineer","a doctor","a lawyer","owns a small restaurant","an architect","an accountant","a teacher","works at a bank","sells insurance"];
  const RETIRED_JOBS = ["a retired teacher","a retired nurse","a retired engineer","a retired police officer","a retired bank manager","a retired mechanic"];
  const FLAG_JOBS = {
    crew: ["a flight attendant with American Airlines","a flight attendant with Delta","a pilot for United","a flight attendant with JetBlue"],
    military: ["active-duty in the US Navy","active-duty in the US Army","an active-duty Marine","active-duty in the Air Force","active-duty in the Coast Guard"],
    industry: ["sells timeshare for Westgate in Orlando","the front desk manager at a Marriott hotel","in sales for Hilton Grand Vacations","a manager at a Hyatt hotel"],
    agent: ["a travel agent","runs a small tour company"]
  };
  const LOOKS = ["in a cap","in sunglasses","in a blue shirt","with the beach bag","in a straw hat","in flip-flops"];
  const HOTELS = [["the Riu Palace Aruba", true],["the Riu Palace Antillas", true],["the Barceló Aruba", true],["the Hilton Aruba", false],
                  ["the Holiday Inn Resort", false],["the Hyatt Regency", false],["the Aruba Marriott", false]];
  const TIMESHARES = ["Marriott's Aruba Surf Club","the Playa Linda Beach Resort","Divi Village"];
  const RENTALS = ["an Airbnb condo in Noord","a rental apartment near Eagle Beach","a rental villa in Malmok"];
  const FREE = ["his sister's condo in Noord, for free","a friend's timeshare week, which the friend gave them for free"];
  const PLACES = ["on the Palm Beach strip, outside the shops","by the entrance of the Paseo Herencia mall","on the sidewalk near the Palm Beach Plaza mall","on the beach path behind the high-rise hotels"];
  const TIMES = [["10:20 am",["to the beach","to rent snorkel gear","to get coffee"]],["3:40 pm",["back to their hotel","to the shops"]],["6:10 pm",["to dinner","to watch the sunset"]]];
  const OBJ = {
    timeshare: "Is this a timeshare thing?",
    own_ts: "We already own a timeshare.",
    commit: "We don't want to commit to anything. We're on vacation.",
    pitch: "We're not sitting through a sales pitch on our vacation.",
    plans: "We've got plans tomorrow.",
    scam: "That sounds too good to be true. What's the catch?",
    breakfast: "Our hotel's all-inclusive. We already have breakfast.",
    early: "8 o'clock is way too early for us.",
    phone: "Why do you need our phone number?",
    think: "Let us think about it. Where can we find you later?",
    time90: "Ninety minutes? That's a big chunk of our day."
  };
  const MOODS = {
    friendly: { start: 6, patience: 12, fake: .6, pool: ["early","think","time90"] },
    chatty: { start: 7, patience: 14, fake: .7, pool: ["early","think","time90"] },
    skeptical: { start: 3, patience: 8, fake: .2, pool: ["timeshare","scam","pitch","phone","own_ts"] },
    hurry: { start: 4, patience: 4, fake: .4, pool: ["time90","think","early"] },
    brush: { start: 1, patience: 2, fake: .3, pool: ["pitch","think"] },
    split: { start: 4, patience: 8, fake: .4, pool: ["commit","pitch","time90","early"] }
  };

  /* ---------- which couple: a case (Q, CT or an NQ reason), then a mood ---------- */
  function pickCase(r, focus, lang){
    const es = lang === "es";
    const q = () => ({ g: "Q", key: es ? weighted(r, [["lat", 5], ["ar", 2], ["us", 1]]) : weighted(r, [["us", 6], ["ca", 2], ["lat", 2], ["ar", 1], ["single", 1], ["samesex", 1], ["leaveEve", 1]]) });
    const ct = () => ({ g: "CT", key: es ? "ar" : weighted(r, [["us", 3], ["old", 2], ["debit", 1], ["ar", 1]]) });
    const nq = () => ({ g: "NQ", key: es
      ? weighted(r, [["latAge", 3], ["arAge", 1], ["out", 3], ["latRetired", 2], ["latDiscover", 2], ["free", 1], ["toured", 1], ["trio", 1], ["agent", 1], ["industry", 1]])
      : weighted(r, [["young", 2], ["latAge", 1], ["out", 1], ["local", 1], ["eu", 2], ["latRetired", 1], ["latDiscover", 1], ["crew", 2], ["military", 2], ["industry", 2],
                     ["agent", 1], ["toured", 2], ["free", 2], ["cruise", 2], ["langMix", 1], ["trio", 1], ["singleMan", 1], ["singleCa", 1]]) });
    const tricky = () => es ? weighted(r, [[{ g: "Q", key: "edgeLat" }, 2], [{ g: "CT", key: "ar" }, 1]])
      : weighted(r, [[{ g: "Q", key: "guard" }, 2], [{ g: "Q", key: "veteran" }, 2], [{ g: "Q", key: "samesex" }, 1], [{ g: "Q", key: "edge70" }, 1],
                     [{ g: "Q", key: "edgeLat" }, 1], [{ g: "CT", key: "old" }, 2], [{ g: "CT", key: "debit" }, 1]]);
    const leaving = () => ({ g: "Q", key: "leaving" });
    if (focus === "nq") return weighted(r, [[nq, 3], [tricky, 1]])();
    if (focus === "any") return weighted(r, [[q, 11], [ct, 3], [nq, 5], [tricky, 1], [leaving, 1]])();
    return weighted(r, [[q, 14], [ct, 3], [nq, 2], [leaving, 1]])();
  }
  function pickMood(r, focus){
    switch (focus){
      case "friendly": return weighted(r, [["friendly", 3], ["chatty", 1]]);
      case "skeptical": return "skeptical";
      case "hurry": return "hurry";
      case "brush": return "brush";
      case "objections": return weighted(r, [["skeptical", 2], ["split", 2], ["friendly", 1]]);
      case "nq": return weighted(r, [["friendly", 3], ["chatty", 2], ["split", 1]]);
      default: return weighted(r, [["friendly", 3], ["chatty", 1], ["skeptical", 2], ["hurry", 2], ["brush", 1], ["split", 2]]);
    }
  }
  /* her age: close to his, and never under 22 */
  const partnerAge = (r, his) => Math.max(22, his + pickR(r, [-6, -4, -3, -2, -1, 0, 1, 2, 3, 5]));

  function makeCouple(focus, lang, r = Math.random){
    const c = pickCase(r, focus, lang);
    let mood = pickMood(r, focus);
    const es = lang === "es";
    let region = "us", country = "the USA", home = "", capLook = "";
    let together = r() < .7 ? "married" : "living together";
    let working = true, retired = false;
    let card = pickR(r, ["Visa", "Mastercard", "Amex", "Discover"]);
    let stayKind = weighted(r, [["hotel", 6], ["timeshare", 2], ["rental", 2]]);
    let sameLang = true, flag = "";
    let speak = es ? "Both speak Spanish. Their English is basic." : "Both speak English.";
    let names = NAMES.us;
    let sexes = ["m", "f"];
    let ages = [], jobs = [];
    const extra = [], cues = [];
    let leaveDays = intR(r, 2, 7);
    let leave = "", canBook = true, bookNote = "";

    const usHome = () => {
      const ca = c.key === "ca" || c.key === "singleCa" || (c.g !== "NQ" && c.key === "us" && r() < .25 && !es);
      const [h, look] = pickR(r, ca ? HOMES.ca : HOMES.us);
      region = ca ? "ca" : "us"; country = ca ? "Canada" : "the USA"; home = h; capLook = look;
      if (es){ speak = "Both speak Spanish and English. They live in the USA but grew up in Puerto Rico."; names = NAMES.lat; }
    };
    const latHome = (ar = false) => {
      if (ar){ region = "ar"; country = "Argentina"; home = `${pickR(r, ARG)}, Argentina`; names = NAMES.ar; }
      else { const [city, ctry] = pickR(r, LAT); region = "latam"; country = ctry; home = city === "Mexico City" || city === "Guatemala City" || city === "Panama City" ? city : `${city}, ${ctry}`; names = NAMES.lat; }
      card = pickR(r, ["Visa", "Mastercard", "Amex"]);
      if (!es) speak = "Both speak Spanish, and good English.";
    };
    const usJobs = (n, age) => {
      if (age >= 62 && r() < .6){ retired = true; working = false; return Array.from({ length: n }, () => pickR(r, RETIRED_JOBS)); }
      const both = r() < .6;
      return Array.from({ length: n }, (_, i) => i === 0 || both ? pickR(r, JOBS_US) : "stays home");
    };
    const latJobs = n => { const both = r() < .5; return Array.from({ length: n }, (_, i) => i === 0 || both ? pickR(r, JOBS_LAT) : "stays home"); };

    switch (c.key){
      case "us": case "ca": {
        usHome();
        const his = c.g === "Q" ? intR(r, 33, 68) : pickR(r, [28, 29, 30, 31, 71, 72, 74, 76, 78]);
        ages = [his, partnerAge(r, his)];
        jobs = usJobs(2, his);
        if (c.g === "CT" && his < 32) ages[1] = Math.min(ages[1], 33);
        if (c.g === "Q" && r() < .5 && mood === "skeptical" && stayKind !== "timeshare") extra.push("You own a timeshare week in Orlando that you rarely use.");
        if (c.key === "us" && c.g === "CT" && !es && r() < .3) card = "debit";
        break;
      }
      case "lat": case "edgeLat": case "latAge": case "latRetired": case "latDiscover": {
        latHome();
        const his = c.key === "edgeLat" ? pickR(r, [40, 60]) : c.key === "latAge" ? pickR(r, [33, 35, 37, 38, 39, 61, 62, 64, 66, 68]) : c.key === "latRetired" ? intR(r, 55, 60) : intR(r, 41, 59);
        ages = [his, partnerAge(r, his)];
        jobs = latJobs(2);
        if (c.key === "latRetired"){ working = false; retired = true; jobs = [pickR(r, RETIRED_JOBS), pickR(r, RETIRED_JOBS)]; }
        if (c.key === "latDiscover"){ card = "Discover"; extra.push("Your only credit card is a Discover. You left the others at home."); }
        break;
      }
      case "ar": case "arAge": {
        latHome(true);
        const his = c.key === "arAge" ? pickR(r, [27, 30, 33, 34, 71, 73, 75]) : c.g === "Q" ? intR(r, 45, 55) : pickR(r, [36, 38, 40, 43, 44, 56, 58, 62, 66, 70]);
        ages = [his, partnerAge(r, his)];
        jobs = latJobs(2);
        break;
      }
      case "single": case "singleMan": case "singleCa": {
        usHome();
        together = "single";
        const male = c.key === "singleMan";
        sexes = [male ? "m" : "f"];
        ages = [c.key === "single" ? intR(r, 41, 64) : intR(r, 42, 60)];
        jobs = [pickR(r, JOBS_US)];
        if (!male) extra.push("You're traveling on your own and loving it.");
        break;
      }
      case "samesex": {
        usHome();
        const s = r() < .5 ? "m" : "f";
        sexes = [s, s];
        ages = r() < .5 ? [pickR(r, [29, 30, 31]), intR(r, 38, 55)] : [intR(r, 35, 60), intR(r, 35, 60)];
        jobs = usJobs(2, Math.max(...ages));
        break;
      }
      case "old": {
        usHome();
        const his = intR(r, 71, 77);
        ages = [his, intR(r, 62, 68)];
        jobs = usJobs(2, his);
        break;
      }
      case "debit": {
        usHome();
        const his = pickR(r, [28, 29, 30, 31]);
        ages = [his, partnerAge(r, his)];
        jobs = usJobs(2, his);
        card = "debit";
        extra.push("You only have a debit card with you. No credit card.");
        break;
      }
      case "edge70": {
        usHome();
        ages = [70, pickR(r, [66, 68, 72])];
        jobs = usJobs(2, 70);
        break;
      }
      case "guard": case "veteran": case "crew": case "military": case "industry": case "agent": case "toured": case "trio": case "leaving": case "leaveEve": {
        usHome();
        const his = intR(r, 34, 62);
        ages = [his, partnerAge(r, his)];
        jobs = usJobs(2, his);
        if (retired && ["guard", "veteran", "crew", "military", "industry", "agent"].includes(c.key)){ retired = false; working = true; jobs = [pickR(r, JOBS_US), pickR(r, JOBS_US)]; }
        if (c.key === "guard") jobs[0] = "an electrician, and in the National Guard one weekend a month";
        if (c.key === "veteran"){ jobs[0] = "a mail carrier, retired from the Navy after 20 years"; cues.push("He wears a Navy veteran cap."); }
        if (["crew", "military", "industry", "agent"].includes(c.key)){
          flag = c.key;
          const who = c.key === "crew" && r() < .6 ? 1 : 0;
          jobs[who] = pickR(r, FLAG_JOBS[c.key]);
          if (c.key === "military") cues.push("He has a short military haircut.");
        }
        if (c.key === "toured"){
          flag = "toured";
          extra.push(pickR(r, [
            "On your last trip, 4 months ago, you stayed at an Iberostar in Cancún and toured it there.",
            "Last March, 7 months ago, someone on this same street invited you and you did the Iberostar tour at the Joia."]));
        }
        if (c.key === "trio"){
          flag = "trio";
          extra.push("You're traveling with two other couples, old friends. They're at a bar across the street.");
          cues.push("Two other couples wave at them from a bar across the street.");
        }
        if (c.key === "leaving"){ leaveDays = 1; leave = "They fly home tomorrow morning. Hotel pickup is at 6:30 am."; canBook = false; bookNote = "They fly home tomorrow morning. That's the one objection you can't work."; }
        if (c.key === "leaveEve"){ leaveDays = 1; leave = "They fly home tomorrow at 7 pm. Hotel pickup is at 4 pm."; bookNote = "They fly home tomorrow evening, with a 4 pm pickup. 8 o'clock tomorrow still works: they're done by 11."; }
        break;
      }
      case "young": {
        usHome();
        const his = intR(r, 22, 27);
        ages = [his, Math.max(21, his + pickR(r, [-2, -1, 0, 1, 2]))];
        jobs = [pickR(r, JOBS_US), pickR(r, JOBS_US)];
        break;
      }
      case "out": {
        const [city, ctry] = pickR(r, OUT);
        region = "out"; country = ctry; home = `${city}, ${ctry}`; names = NAMES.lat;
        if (!es) speak = "Both speak Spanish, and good English.";
        const his = intR(r, 40, 58);
        ages = [his, partnerAge(r, his)];
        jobs = latJobs(2);
        card = pickR(r, ["Visa", "Mastercard"]);
        break;
      }
      case "local": {
        region = "aw"; country = "Aruba"; home = `${pickR(r, AW)}, Aruba`; names = NAMES.aw; stayKind = "home";
        speak = "Both speak Papiamento, English, Spanish and Dutch.";
        const his = intR(r, 35, 55);
        ages = [his, partnerAge(r, his)];
        jobs = [pickR(r, ["works at the airport", "a police officer", "a teacher", "works at a bank"]), pickR(r, ["a nurse", "works at a bank", "a teacher"])];
        extra.push("You live here in Aruba. You're out for a walk and an ice cream.");
        break;
      }
      case "eu": {
        const [city, ctry, tongue] = pickR(r, EU);
        region = "eu"; country = ctry; home = `${city}, ${ctry}`; names = NAMES.eu;
        speak = tongue === "English" ? "Both speak English." : `Both speak ${tongue} and good English.`;
        if (tongue !== "English") cues.push(`They're speaking ${tongue} to each other.`);
        const his = intR(r, 36, 62);
        ages = [his, partnerAge(r, his)];
        jobs = [pickR(r, JOBS_US), pickR(r, JOBS_US)];
        card = pickR(r, ["Visa", "Mastercard"]);
        break;
      }
      case "free": case "cruise": {
        usHome();
        const his = intR(r, 36, 64);
        ages = [his, partnerAge(r, his)];
        jobs = usJobs(2, his);
        stayKind = c.key;
        if (c.key === "cruise"){ canBook = false; leaveDays = 0; leave = "Their cruise ship sails at 5 pm today."; bookNote = "They sail tonight, so there's no time, and cruise guests aren't staying at a hotel here."; cues.push("They wear cruise ship lanyards with their key cards."); }
        break;
      }
      case "langMix": {
        usHome();
        const his = intR(r, 38, 60);
        ages = [his, partnerAge(r, his)];
        jobs = usJobs(2, his);
        sameLang = false;
        speak = "He speaks only English. She speaks only Spanish (she grew up in Colombia). She answers in Spanish, and he translates now and then.";
        cues.push("He talks to her in English. She answers in Spanish.");
        break;
      }
    }

    if (!es && c.g !== "NQ" && region === "latam" && r() < .3) cues.push("They're speaking Spanish to each other.");
    if (es && (region === "latam" || region === "ar" || region === "out")) cues.push("They're speaking Spanish to each other.");
    if (sexes.length === 1 && mood === "split") mood = "friendly";

    const used = new Set();
    const people = sexes.map((s, i) => {
      let n = pickR(r, names[s]);
      while (used.has(n)) n = pickR(r, names[s]);
      used.add(n);
      return { name: n, age: ages[i], sex: s, job: jobs[i] || "", look: "" };
    });
    if (sexes.length === 2 && sexes[0] === sexes[1]){
      const looks = [...LOOKS].sort(() => r() - .5);
      people[0].look = looks[0]; people[1].look = looks[1];
    }

    let stay = "", allIn = false;
    if (stayKind === "hotel"){ const [h, ai] = pickR(r, HOTELS); allIn = ai; stay = `${h}${ai ? ", all-inclusive" : ""}. They paid for it.`;
      if (ai && r() < .7) cues.push(`${people.length > 1 && r() < .5 ? people[1].name : people[0].name} has an all-inclusive bracelet from ${h}.`); }
    if (stayKind === "timeshare"){ const t = pickR(r, TIMESHARES); stay = `${t}, their own timeshare week. They pay the yearly fees.`; if (r() < .6) cues.push(`Their beach bag says ${t.replace(/^the /, "")}.`); }
    if (stayKind === "rental"){ stay = `${pickR(r, RENTALS)}. They paid for it.`; if (r() < .4) cues.push("He's carrying grocery bags from Ling & Sons."); }
    if (stayKind === "free") stay = `${pickR(r, FREE)}.`;
    if (stayKind === "cruise") stay = "the cruise ship docked in Oranjestad, in port today only.";
    if (stayKind === "home") stay = "their own home. They live here.";
    // Cues name people by look, not name: the promoter doesn't know names yet.
    for (let i = 0; i < cues.length; i++) for (const p of people)
      cues[i] = cues[i].replace(p.name, people.length === 1 || sexes[0] !== sexes[1] ? (p.sex === "m" ? "He" : "She") : `The one ${p.look}`);
    if (capLook && r() < .5 && sexes.includes("m") && !(sexes.length === 2 && sexes[0] === sexes[1])) cues.push(capLook);

    if (!leave){
      leave = leaveDays === 1 ? "They fly home tomorrow." : `They fly home in ${leaveDays} days.`;
      if (region === "aw") leave = "They live here.";
    }
    let plans = stayKind === "cruise" ? "Tomorrow the ship is at sea, on the way to Curaçao."
      : c.key === "leaving" ? "Tomorrow morning they fly home."
      : region === "aw" ? "Tomorrow: work as usual."
      : "Tomorrow: nothing planned yet. Maybe the beach.";
    if (canBook && region !== "aw" && c.key !== "leaveEve"){
      const p = weighted(r, [["none", 4], ["afternoon", 3], ["morning", leaveDays >= 3 ? 2 : 0], ["dinner", 1]]);
      if (p === "afternoon") plans = `Tomorrow at 1 pm: a ${pickR(r, ["jeep tour", "catamaran sail", "horseback ride"])}, already paid.`;
      if (p === "dinner") plans = "Tomorrow night: dinner at Gianni's. The morning is free.";
      if (p === "morning"){ plans = "Tomorrow at 9 am: a snorkel trip, already paid. The day after tomorrow is free."; bookNote = "Tomorrow morning they have a prepaid trip, so tomorrow doesn't work. The day after is free: book that day."; }
    }

    const m = MOODS[mood];
    const objections = [];
    const nObj = focus === "objections" ? 2 : mood === "skeptical" || mood === "split" ? 1 + (r() < .4 ? 1 : 0) : r() < .5 ? 1 : 0;
    const pool = [...m.pool];
    if (stayKind === "timeshare" || extra.some(e => /timeshare week in Orlando/.test(e))) pool.push("own_ts", "own_ts");
    if (allIn) pool.push("breakfast");
    const busy = /already paid|dinner/.test(plans);
    if (busy) pool.push("plans", "plans");
    if (focus === "objections") pool.push("own_ts", "commit", "scam", "time90", ...(busy ? ["plans"] : []));
    while (objections.length < nObj && pool.length){
      const k = pool.splice(Math.floor(r() * pool.length), 1)[0];
      if (k === "own_ts" && stayKind !== "timeshare" && !extra.some(e => /timeshare/.test(e))) extra.push("You own a timeshare week in Orlando that you rarely use.");
      if (!objections.includes(OBJ[k])) objections.push(OBJ[k]);
    }
    const keen = mood === "split" && people.length > 1 ? (r() < .5 ? 0 : 1) : -1;
    const moodCue = {
      friendly: "They're smiling and in no rush.", chatty: "They're laughing about something as they walk.",
      skeptical: "They look at you, then look away.", hurry: "They're walking fast and checking the time.",
      brush: "They avoid eye contact and keep walking.", split: "One of them slows down to look at you. The other keeps walking."
    };
    cues.unshift(moodCue[mood]);

    const [time, heads] = pickR(r, TIMES);
    let heading = pickR(r, heads);
    if (mood === "hurry") heading = pickR(r, ["to a dinner reservation at 6:30", "to catch a sunset sail", "to meet friends for dinner"]);
    if (stayKind === "cruise") heading = "back toward the cruise port";
    const scene = { place: pickR(r, PLACES), time: stayKind === "cruise" ? "2:30 pm" : mood === "hurry" ? "6:10 pm" : time, heading };

    const facts = { region, country, home: home || country, together, working, retired, card, stayKind, sameLang, flag };
    const graded = rules(facts, people);
    const kind = c.g === "NQ" ? `NQ: ${c.key}` : c.key === "leaving" ? "Q: leaving tomorrow" : `${c.g}: ${c.key}`;
    return {
      v: 1, lang, focus, mood, kind, people, ...facts,
      stay, allIn, leave, plans, speak, extra, objections, fake: r() < m.fake, start: keen > -1 ? 4 : m.start, patience: m.patience, keen,
      scene, cues: cues.slice(0, 3), grade: graded.g, why: graded.why, canBook, bookNote
    };
  }
  /* The grade a case was built for, for tests. */
  const intended = c => c.kind.startsWith("NQ") ? "NQ" : c.kind.startsWith("CT") ? "CT" : "Q";
  const cardText = c => c === "debit" ? "a debit card, no credit card" : c === "Amex" ? "an Amex" : `a ${c}`;
  const fromText = c => c.home + (c.region === "us" ? ", USA" : c.region === "ca" ? ", Canada" : "");

  function moodText(c){
    const [a, b] = c.people.map(p => p.name);
    switch (c.mood){
      case "friendly": return "friendly and relaxed. You like meeting locals.";
      case "chatty": return "chatty. You love telling stories about your trip and ask the promoter questions about Aruba.";
      case "skeptical": return "skeptical. You've been warned about timeshare pitches and street scams. You warm up only to honest, clear answers.";
      case "hurry": return "in a hurry. You're on your way somewhere and keep an eye on the time. You like it short.";
      case "brush": return "you don't want to talk to street promoters. You say \"no thanks\" and keep walking unless the opener really catches you.";
      default: return c.keen === 0 ? `${a} is keen (interest 6) and likes free breakfasts. ${b} is reluctant (interest 2) and wants a real reason before giving up a morning.`
                                   : `${b} is keen (interest 6) and likes free breakfasts. ${a} is reluctant (interest 2) and wants a real reason before giving up a morning.`;
    }
  }

  /* What the couple reads: the facts in plain sentences. */
  function brief(c){
    const ids = ["A", "B"];
    const rel = c.together === "single" ? "Traveling alone." : c.together === "married" ? "Married." : "Living together, not married.";
    return [
      "COUPLE BRIEF",
      `Scene: ${c.scene.time}, ${c.scene.place}. You're walking ${c.scene.heading}. A street promoter steps up to you.`,
      ...c.people.map((p, i) => `${ids[i]}: ${p.name}, ${p.sex === "m" ? "man" : "woman"}, ${p.age}, ${p.job || "doesn't work"}.${p.look ? ` (The one ${p.look}.)` : ""}`),
      `${rel} Home: ${fromText(c)}.`,
      `Staying at: ${c.stay}`,
      c.leave,
      c.plans,
      `Credit card: ${cardText(c.card)}.`,
      `Language: ${c.speak} ${c.lang === "es" ? "Speak Spanish." : c.sameLang ? "Speak English." : "He speaks English. She speaks Spanish."}`,
      ...(c.extra.length ? [`Other facts: ${c.extra.join(" ")}`] : []),
      `Mood: ${moodText(c)}`,
      `Start interest: ${c.start}. Patience: ${c.patience <= 2 ? "almost none: after 2 lines from the promoter you walk on, unless your interest has climbed to 4 or more" : c.patience <= 4 ? "short: after about 4 lines from the promoter you need to go, unless your interest is 7 or more" : `about ${c.patience} lines from the promoter before you want to move on`}.`,
      `On your mind (say these in your own words when they fit): ${c.objections.length ? c.objections.map(o => `"${o}"`).join(" ") : "nothing special."}`,
      `Yes-sayers: ${c.fake ? "yes. You say yes easily to be polite, but you only really mean maybe until the promoter checks again." : "no. When you say yes, you mean it."}`,
      `What the promoter can see: ${c.cues.join(" ")}`
    ].join("\n");
  }

  /* What the phone shows when the chat starts: the scene, what can be seen, who talks. */
  const sceneOut = c => ({ lang: c.lang, place: c.scene.place, time: c.scene.time, heading: c.scene.heading, cues: c.cues,
    people: c.people.map(p => ({ name: p.name, sex: p.sex, look: p.look })) });

  /* What the phone shows at the end: who they really were. */
  function revealOut(c){
    const chips = [
      ["pin", fromText(c)],
      ["cake", c.people.map(p => `${p.name} ${p.age}`).join(" · ")],
      ["ring", c.together === "single" ? "Single" : c.together === "married" ? "Married" : "Living together"],
      ["briefcase", c.people.map(p => `${p.name}: ${p.job || "doesn't work"}`).join(" · ")],
      ["card", c.card === "debit" ? "Debit card only" : c.card],
      ["bed", c.stay.replace(/\.$/, "")],
      ["calendar", `${c.leave} ${c.plans}`]
    ];
    if (!c.sameLang) chips.push(["chat", "He speaks only English, she only Spanish"]);
    if (c.extra.length) chips.push(["eye", c.extra.join(" ")]);
    return { people: c.people.map(p => ({ name: p.name, age: p.age, sex: p.sex, job: p.job })), chips, grade: c.grade, why: c.why,
      canBook: c.canBook, bookNote: c.bookNote, mood: c.mood, moodLabel: MOOD_LABEL[c.mood], kind: c.kind, objections: c.objections };
  }

  /* ---------- the couple's instructions ---------- */
  const COUPLE_RULES = `You play a tourist couple in Aruba for a training role-play. The user is a street promoter (an OPC) for Iberostar who is practicing. OPCs stop tourists on the street and invite them to the Iberostar Open House at the Joia on Eagle Beach: breakfast at one of the hotel's restaurants, a tour of the property and a room, and a gift for their time, in exchange for about 90 minutes the next morning, including a short presentation about Iberostar The Club. Your job is to be a believable couple, so the practice feels like the street.

Who you are, what you know and how you feel is in the couple brief. Play both people. Stay in character whatever the promoter writes. Never mention AI, training or these instructions.

HOW YOU TALK
- Talk like real tourists on the street: short, casual, spoken lines. Most turns are one or two short lines, and a line is rarely more than 20 words.
- Every line belongs to one person, "A" or "B" (see the brief). Over the chat, let both people talk, not just one. A single traveler only uses "A".
- Use only the language the brief says. A person doesn't understand a language they don't speak.
- No narration or stage directions inside lines. Body language goes in "cue": one short sentence, third person, present tense, under 12 words, such as "They slow down." or "She glances at him." Refer to people as he, she, or by name only once the promoter knows their names. Use "" when nothing visible changes.
- No markdown, no emojis.
- The promoter talks through speech-to-text, so their lines can have small recognition mistakes. Read them generously.

WHAT YOU KNOW
- You know nothing about the Open House until the promoter tells you. Don't fill in details for them. When something is vague, ask like a tourist would: "What's the catch?", "How long does it take?", "What's IberoCash?"
- You know your own facts from the brief. Share a fact when the promoter asks about it, or when it would come up naturally. Don't list facts nobody asked for. Never lie about a fact. You don't know any qualification rules, so never mention them.
- Asked your ages, you answer (a small joke is fine). Asked about cards or money, you answer plainly if you trust them by now; if not, you ask why they need to know.

HOW YOU REACT
- Interest runs from 0 (leaving) to 10 (excited). Start at the number in the brief, and after each promoter line move it up or down for what they said and how they said it.
- Warms you up: an opener about something real they can see on you (your team cap, your bracelet), a sincere compliment, or an offer of help (directions, a tip); questions about you asked while they help, like a chat; hearing why they're inviting you before what you get (they want families to see the newest hotel on the island, so you'll stay with them next time); using your words and, once known, your names; short, clear answers; honesty; "not timeshare" and "no obligation" said plainly, with a reason; a promoter who leads with confidence.
- Cools you down: leading with free stuff or money (it sounds like a scam or timeshare); personal questions one after another, like an interview; being asked what you earn; long speeches; ignoring what you said; a compliment that sounds fake or flirty; pressure to decide right now ("last spot, today only!"); pushing after a clear no; vague or dodgy answers; anything that sounds untrue.
- "Would you like an invitation?" is easy to say no to. "Let me get you an invitation" moves things along, unless you have an objection: then you say it.
- Bring up the objections in the brief when they fit, usually when the invitation or the time comes up. Your objections are partly a test of the promoter: if they welcome the question and answer it plainly and truthfully, you relax; if they dodge, get defensive or say something untrue, your interest drops.
- If the promoter hasn't made the morning clear (what you get, where, when, how long), you hesitate, with something like "Let us think about it."
- Asked for a phone number with no reason, you hesitate. If they explain it (a short confirmation call this afternoon between 5 and 6, WhatsApp is fine), you give it when you're interested. Make up a realistic number for your country.
- When they say how long it takes, react to the number they give. Never correct them: you don't know.
- If the promoter says they only get credit, or a bonus, when you show up, and you like them, it makes you want to keep your word.
- If interest drops to 1 or less, or your patience in the brief runs out, say a short goodbye and walk on: state "left".
- You agree to come only when your interest is 6 or more, your objections got real answers, and the day and time fit your plans and your flight. Once you've agreed to a specific day and time, set "booked" to true, and keep it true unless you back out.
- If you can't come at all (you leave too soon), say so when the invitation or the time comes up, and don't let yourself be talked into it.
- If the promoter says you don't qualify, or lets you go, take it kindly and say goodbye: state "ended".

YOUR REAL INTENTION
- "intent" is whether you would really show up, right now: "no", "maybe" or "yes". It can differ from what you say out loud.
- If the brief says you're yes-sayers, you may say "sure, we'll try" while your intent is only "maybe". Only when the promoter checks again (asks if you're sure, says other families want the spot, offers to give it to someone else) do you either commit for real (intent "yes") or admit you won't come.

ENDING
- "state" is "talking" while the conversation goes on, "left" when you walk off unhappy or not interested, and "ended" when you part on good terms, booked or not.
- Once you're booked and the promoter has wrapped up, say goodbye and set "ended". If they keep talking long after you're booked, start leaving.`;

  const TURN_FORMAT = `REPLY FORMAT
Reply with only one JSON object, nothing before or after it:
{"lines":[{"who":"A","text":"..."}],"cue":"","interest":5,"intent":"no","booked":false,"state":"talking"}
- lines: one or two short spoken lines; "who" is "A" or "B".
- cue: body language the promoter can see, or "".
- interest: a whole number from 0 to 10. intent: "no", "maybe" or "yes".
- booked: true once you've agreed to a day and time. state: "talking", "left" or "ended".`;

  const TURN_SCHEMA = {
    type: "object",
    properties: {
      lines: { type: "array", items: { type: "object", properties: { who: { type: "string", enum: ["A", "B"] }, text: { type: "string" } }, required: ["who", "text"], additionalProperties: false } },
      cue: { type: "string" },
      interest: { type: "integer" },
      intent: { type: "string", enum: ["no", "maybe", "yes"] },
      booked: { type: "boolean" },
      state: { type: "string", enum: ["talking", "left", "ended"] }
    },
    required: ["lines", "cue", "interest", "intent", "booked", "state"],
    additionalProperties: false
  };
  const STAGE_NOTE = "\n\n(Stage note, not said by the promoter: you have to go now. Wrap up and say goodbye in this turn.)";

  const clean = (s, max) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

  /* Check and tidy one couple reply. null when it isn't usable. */
  function normReply(raw, single){
    if (!raw || typeof raw !== "object") return null;
    const out = [];
    for (const l of (Array.isArray(raw.lines) ? raw.lines : []).slice(0, 4)){
      if (!l || typeof l !== "object") continue;
      const t = clean(l.text, 400);
      if (t) out.push({ who: l.who === "B" && !single ? "B" : "A", text: t });
    }
    const state = raw.state === "left" || raw.state === "ended" ? raw.state : "talking";
    if (!out.length && state === "talking") return null;
    const n = Math.round(Number(raw.interest));
    return { lines: out, cue: clean(raw.cue, 160), interest: Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 5,
      intent: raw.intent === "yes" || raw.intent === "no" ? raw.intent : "maybe", booked: raw.booked === true, state };
  }

  /* The API path: the promoter is "user", the couple is "assistant". Rules and brief go in the system prompt. */
  function toMessages(log, next, wrapUp){
    const msgs = log.map(e => "o" in e ? { role: "user", content: e.o } : { role: "assistant", content: JSON.stringify(e.c) });
    msgs.push({ role: "user", content: wrapUp ? next + STAGE_NOTE : next });
    return msgs;
  }
  /* The Claude-version path: no system prompt, so the rules and brief lead as the first user turn. */
  function sampleTurns(c, log, next, wrapUp){
    const lead = { role: "user", content: `${COUPLE_RULES}\n\n${brief(c)}\n\n${TURN_FORMAT}\n\nThe conversation starts now. Every user turn after this one is what the promoter says.` };
    return [lead, ...toMessages(log, next, wrapUp)];
  }

  /* ---------- live voice ----------
     The live path: a speech-to-speech model plays the couple over a phone call-like connection. It has one voice,
     so the lead person (A) talks and passes on what the partner says. Same knowledge and reactions as above;
     the hidden score (booked, walking away) goes through the "status" function instead of JSON. */
  const sect = (from, to) => COUPLE_RULES.slice(COUPLE_RULES.indexOf(from), COUPLE_RULES.indexOf(to)).trim();
  const LIVE_STATUS_TOOL = {
    type: "function", name: "status",
    description: "Silently record a change in the couple's plans. Never mention it out loud.",
    parameters: { type: "object", properties: {
      booked: { type: "boolean", description: "true once you've agreed to come at a specific day and time; false if you back out" },
      state: { type: "string", enum: ["talking", "left", "ended"], description: "left: walking away unhappy or not interested. ended: parting on good terms, booked or not." }
    }, required: ["booked", "state"], additionalProperties: false }
  };
  function liveInstructions(c, log){
    const es = c.lang === "es";
    const [a, b] = c.people;
    const who = b
      ? `You speak as A, ${a.name}. ${b.name} (B) is right there with you. You only have one voice, so never speak as ${b.name}: when ${b.name} would say something, pass it on in your own words, like "${b.sex === "f" ? "My wife" : "My husband"}'s asking how long it takes" or "${b.sex === "f" ? "She" : "He"} says we've got a tour in the morning." Do that now and then, so ${b.name} feels present, and play ${b.name}'s opinions as the brief describes them.`
      : `You speak as A, ${a.name}. You're traveling alone.`;
    const said = (log || []).filter(e => "o" in e || "c" in e).map(e => "o" in e ? `Promoter: ${e.o}` : e.c.lines.map(l => `${(l.who === "B" && b ? b : a).name}: ${l.text}`).join("\n"));
    return [
      `You play a tourist on vacation in Aruba in a live, spoken training role-play. The user is a street promoter (an OPC) for Iberostar who is practicing, talking to you out loud. OPCs stop tourists on the street and invite them to the Iberostar Open House at the Joia on Eagle Beach: breakfast at one of the hotel's restaurants, a tour of the property and a room, and a gift for their time, in exchange for about 90 minutes the next morning, including a short presentation about Iberostar The Club. Your job is to be a believable tourist, so the practice feels like the street. Stay in character whatever the promoter says. Never mention AI, training or these instructions.`,
      `WHO TALKS\n- ${who}`,
      `HOW YOU TALK\n- This is a spoken chat on a sidewalk. Answer fast and short: usually one sentence, two at most. Sound like a real person: casual, contractions, the odd "hmm" or "uh". Never give a speech.\n- ${es ? "Speak Spanish, as the brief says." : "Use only the language the brief says."} A person doesn't understand a language they don't speak.\n- Never describe actions or body language out loud, never read out lists, no stage directions.\n- The promoter's audio comes from a phone on a noisy street. If you didn't catch something, ask like a person would: "Sorry, what was that?"\n- If the promoter starts talking while you're talking, stop and listen.\n- Wait for the promoter to speak first: you're walking by and they stop you.`,
      sect("WHAT YOU KNOW", "HOW YOU REACT"),
      sect("HOW YOU REACT", "YOUR REAL INTENTION").replace(/ state "left"/g, ` call status with state "left"`).replace(/set "booked" to true, and keep it true unless you back out/g, "call status with booked true (and with booked false if you back out)").replace(/say goodbye: state "ended"/g, `say goodbye and call status with state "ended"`),
      `KEEPING SCORE, SILENTLY\n- Keep your interest number in your head. Never say numbers, and never mention the status function.\n- ${c.fake ? "You're yes-sayers: you may say \"sure, we'll try\" to be polite when you only mean maybe. Only when the promoter checks again (asks if you're sure, says other families want the spot) do you commit for real or admit you won't come." : "When you say yes, you mean it."}\n- Once you're booked and the promoter has wrapped up, say goodbye and call status with state "ended". If they keep talking long after you're booked, start leaving.`,
      brief(c).replace(/^COUPLE BRIEF/, "THE BRIEF (only you know this)"),
      said.length ? `THE CONVERSATION SO FAR (it was typed; carry on from here as if it was spoken)\n${said.join("\n")}` : ""
    ].filter(Boolean).join("\n\n");
  }
  /* Lines the phone heard on a live call, as log entries the coach reads. Untrusted: clamp everything. */
  function liveLog(items, single){
    const out = [];
    for (const it of (Array.isArray(items) ? items : []).slice(0, 80)){
      if (!it || typeof it !== "object") continue;
      const t = clean(it.text, 400); if (!t) continue;
      if (it.me) out.push({ o: t });
      else out.push({ c: { lines: [{ who: "A", text: t }], cue: "", booked: it.booked === true, state: ["left", "ended"].includes(it.state) ? it.state : "talking", live: true } });
    }
    return out;
  }

  /* ---------- the coach ---------- */
  /* Voice-note lines the coach can point to (ids match SCRIPT_LINES and NLP_LINES in the app). */
  const LINES = [
    ["s1a", "Inviting families to the newest hotel on the island, so next time you travel you'll want to stay with us."],
    ["s1b", "Inviting as many people as we can to see our hotel; it also helps us spread the word."],
    ["s2a", "It's an amazing promotion: a full branding experience, not just a quick look."],
    ["s2b", "When you arrive, we treat you to breakfast at one of our five-star restaurants."],
    ["s2c", "I see you have a bracelet from Riu... you're going to love our place, something new."],
    ["s2d", "A personalized tour of the property: the facilities and the service."],
    ["s2e", "They'll show you one of our rooms, so you can anticipate the quality."],
    ["s2f", "We reward you for your time: IberoCash for restaurants, shopping and activities."],
    ["s2g", "We partner with the best: Gianni's, Screaming Eagle, Daniel's Steakhouse."],
    ["s2h", "We own Tierra del Sol, opened our first hotel, two more coming."],
    ["s3a", "Let me get you an invitation."],
    ["s4a", "Let me put you down for 8 o'clock."],
    ["s5a", "We also do confirmation calls, between 5 and 6, WhatsApp is fine, just to see if you can still make it."],
    ["s6a", "Make sure to bring this invitation, to confirm which gift you are offered."],
    ["s6b", "A nice breakfast, a quick tour. We're not selling timeshare: no weeks, points or maintenance fees."],
    ["s6c", "No obligation to be a member to stay there. Just like Hyatt, just like Hilton."],
    ["s6d", "We only ask families for 90 minutes, and breakfast tends to eat about half of that."],
    ["s7a", "So we see you guys tomorrow at 8 for sure?"],
    ["s7b", "Sorry if I misunderstood, but I thought you were pretty sure you were coming."],
    ["s7c", "A lot of families want to come; we wouldn't want to block a space if you're not sure."],
    ["s7d", "Maybe I should give this invitation to somebody else."],
    ["s7e", "I get a little $65 bonus just for you showing up. You don't have to book or buy anything."],
    ["n1b", "Where are you guys from? First time in Aruba?"],
    ["n2a", "When you come to breakfast tomorrow, bring this invitation."],
    ["n2b", "Is WhatsApp or a regular call better for you guys?"],
    ["n3a", "Beautiful day, right? Enjoying Eagle Beach? We're inviting families to see the newest hotel."],
    ["n3b", "Picture the two of you tomorrow, breakfast at one of our five-star restaurants."],
    ["n4a", "Perfect, then you already know how much a good vacation matters."]
  ];
  const LINE_IDS = LINES.map(l => l[0]);
  const STEP_KEYS = ["open", "why", "news", "offer", "time", "number", "plan", "lockin"];
  const ASKED = ["from", "age", "together", "work", "card", "stay", "leave", "plans", "tour"];

  const COACH_RULES = `You are Shoco, the coach in Show-Up Academy, the training app for Iberostar's street team in Aruba. Street promoters (OPCs) invite tourist couples to the Iberostar Open House at the Joia on Eagle Beach. One of them just finished a practice chat with a role-played couple. Review it and give feedback they can use on the street tomorrow.

THE 8 STEPS (what good looks like)
1. open: Stop them and break the ice. Read them as they come (a team cap, a hotel bracelet, kids, a map in hand) and open with something real about them, a sincere compliment (never flirty) or an offer of help, with a smile. Ask about them while you help (where they're from, first time in Aruba), like a chat. Free stuff first is wrong.
2. why: Say why you're inviting them, before any gift. "We're inviting families to come see the newest hotel on the island, so next time you travel you'll want to stay with us." Gift first ("free breakfast and $100!") sounds like a scam, not true, or timeshare.
3. news: The good news, in this order: breakfast at one of our five-star restaurants, a personal tour of the property, one of our rooms, and a reward for their time (IberoCash for the best restaurants, activities and shopping; the taxi is on us both ways). Make it personal with what you see (a Riu bracelet: "you're eating breakfast at the same place every day"). Be specific, so they can picture the morning. Tie the reward to what they love (a great dinner: Gianni's or Daniel's; a tour: Rocka Beach Tours), and only promise what the invitation gives.
4. offer: Say it, don't ask: "Let me get you an invitation." Not "Would you like one?" Objections come out here; work them (below).
5. time: "Let me put you down for 8 o'clock." Too early? Offer 10. Check their plans and flight: they need 3 free hours that morning with nothing prepaid, and on departure day at least 4 hours before airport pickup.
6. number: Write slowly and keep making a friend with small questions. Ask for the number with the reason: a manager calls this afternoon between 5 and 6, only to check they can still make it. WhatsApp is fine.
7. plan: Bring this invitation to confirm the gift. Breakfast, a quick tour, and how to book direct through the loyalty club. Not timeshare (no weeks, points or maintenance fees): a full-service hotel like Hyatt or Hilton, no obligation to be a member. "We only ask families for 90 minutes, and breakfast tends to eat about half of that." Never say 45 minutes or break it into minutes. Be open that there is a short presentation about the club ("a little information about the club"); never tell them to hide it. Every adult brings 1 ID; one credit card is enough. If they ask why the card: in case they like what they see, we can show them how to get involved. Nothing is charged.
8. lockin: "So we see you guys tomorrow at 8 for sure?" Read the answer. "We'll try" or "we'll see": ask again, lots of families want the spot; still unsure, offer to give it to another family. Making it yours helps: "I get a little bonus just for you showing up; you don't have to book or buy anything." A solid no beats a fake yes.

WHO QUALIFIES
- USA and Canada: the man's age counts (same-sex couple: either partner's). 32 to 70 is Q (full gift); 28 to 31 and 71+ is CT (half gift); under 28 is NQ (no gift). Married or living together. One works or is retired. Visa, Mastercard, Amex or Discover; a debit card is OK for CT. Single women: USA only, 40 to 65.
- Central and South America and the Caribbean (Mexico counts as Central America): 40 to 60 is Q, any other age NQ. Couples only, one must work (no retirees), Visa, Mastercard or Amex (no Discover). Argentina: 45 to 55 Q, 35 to 44 and 56 to 70 CT, other ages NQ.
- Always NQ: Aruba, Cuba, Venezuela, Haiti and Ecuador; anyone else, like Europeans; travel agents and tour operators; airline pilots and crew; active US military (the National Guard is OK); people who work for hotel, timeshare or vacation club companies; an Iberostar tour in the last 6 months in-house or 12 months from a street program; three couples or more traveling together; not paying for where they stay; not fluent in the same language.
- Find out inside the small talk, never like an interview: where they're from, ages (with older couples, "are you retired yet?"), married or living together, work ("what do you do back home?"), card, where they're staying, when they leave and their plans, any recent Iberostar tour. Asking what they earn is never needed.
- An NQ couple gets no invitation. The right move is to find out early and let them go with a smile. Never ask anyone to bend the truth to qualify.

NLP AND STREET MOVES TO NOTICE
- Rapport: match their energy and pace, use their words and names, ask easy questions, talk less than they do.
- Assume the yes ("Let me get you an invitation", "When you come tomorrow"). Give the reason ("because"). Two yeses only for the call ("WhatsApp or a regular call?"), never for the time. Tag questions ("for sure?").
- Pace and lead: two or three true things first, then lead. Future pacing: help them picture breakfast tomorrow.
- Read the real answer: eye contact and questions mean yes; "we'll try", glances and short answers mean doubt.
- Objections are tests. Welcome them ("Great question") and answer with the plain truth. "Let me think about it" usually means they can't picture the morning yet: paint it again, specifically. Reframes: own a timeshare ("then you know how much a good vacation matters; this is a hotel, no weeks or points"); don't want to commit ("no obligation to book or buy"); plans tomorrow ("what time? we start at 8 and you're done by 11"); sounds like a scam ("I get it, it sounds too good; that's why it's an Open House, come see it yourself"). Leaving tomorrow morning can't be worked.
- Honest only. Never trade the truth for a yes. Tricks like holding an ID, a made-up "last spot" or confusing them on purpose are never OK: call them out in the note for that step.

GRADING EACH STEP
- "good": done well, in the spirit of the lines above. Their own words are fine.
- "weak": done, but only partly, late, out of order, or in a way that hurt: gift first, an interview of questions, "would you like", minutes, the number with no reason, no second check after "we'll try", a pressure trick.
- "missed": the chat reached the point where this step belonged, and they skipped it.
- "lockin" is "good" only when they asked a real check ("So we see you guys tomorrow at 8 for sure?") and read the answer. A plain goodbye like "See you at 8!" is "weak".
- "na": the chat never got there (the couple walked away first), or the step didn't apply (an NQ couple the promoter rightly let go before inviting them, or a couple who can't come).
- "qualify": "good" if they found out enough to know the right gift and that the time works, inside the small talk; "weak" if they found out part, or fired questions like an interview; "missed" if they barely asked; "na" only if the couple was gone within the first two lines.
- "asked": which facts they found out, from: from, age, together, work, card, stay, leave, plans, tour. Count a fact if the couple said it, even unasked.

WRITING THE FEEDBACK
- Talk to the promoter as "you". Plain, short sentences a busy person reads in ten seconds. Kind and direct, never gushing. No jargon beyond the move names above.
- Every note points at something they said or didn't say. Quote their words when it helps.
- "try": one better line for that moment, ready to say, fitted to this couple (their hotel, their words). "" when the step was good or na.
- "line": the id of the matching voice-note line from the list below when one fits, else "".
- "headline": one sentence on how it went. "best": their best line, quoted exactly from the chat ("" if none stands out). "fix": the one habit to change next time.
- "showup": would this couple really come? "solid", "shaky" or "no" if they were booked; "na" if they weren't.
- Write notes in English. Quote the promoter in the language they used. Write "try" lines in the language of the chat.

VOICE-NOTE LINES (id: line)
${LINES.map(([id, t]) => `${id}: ${t}`).join("\n")}`;

  const COACH_FORMAT = `REPLY FORMAT
Reply with only one JSON object, nothing before or after it, shaped like this:
{"headline":"...","steps":{${STEP_KEYS.map(k => `"${k}":{"status":"good","note":"...","try":"","line":""}`).join(",")}},"qualify":{"status":"weak","asked":["from","stay"],"note":"..."},"best":"...","fix":"...","showup":"shaky"}
- Every step's status is "good", "weak", "missed" or "na". "line" is an id from the list above, or "".
- "asked" uses only: ${ASKED.join(", ")}. "showup" is "solid", "shaky", "no" or "na".`;

  const STEP = {
    type: "object",
    properties: { status: { type: "string", enum: ["good", "weak", "missed", "na"] }, note: { type: "string" }, try: { type: "string" }, line: { type: "string", enum: [...LINE_IDS, ""] } },
    required: ["status", "note", "try", "line"],
    additionalProperties: false
  };
  const COACH_SCHEMA = {
    type: "object",
    properties: {
      headline: { type: "string" },
      steps: { type: "object", properties: Object.fromEntries(STEP_KEYS.map(k => [k, STEP])), required: [...STEP_KEYS], additionalProperties: false },
      qualify: { type: "object", properties: { status: { type: "string", enum: ["good", "weak", "missed", "na"] }, asked: { type: "array", items: { type: "string", enum: [...ASKED] } }, note: { type: "string" } },
                 required: ["status", "asked", "note"], additionalProperties: false },
      best: { type: "string" }, fix: { type: "string" },
      showup: { type: "string", enum: ["solid", "shaky", "no", "na"] }
    },
    required: ["headline", "steps", "qualify", "best", "fix", "showup"],
    additionalProperties: false
  };

  const ST = ["good", "weak", "missed", "na"];
  function normCoach(raw){
    if (!raw || typeof raw !== "object" || !raw.steps || typeof raw.steps !== "object") return null;
    const steps = Object.fromEntries(STEP_KEYS.map(k => {
      const s = raw.steps[k] || {};
      return [k, { status: ST.includes(s.status) ? s.status : "na", note: clean(s.note, 400), try: clean(s.try, 300), line: LINE_IDS.includes(s.line) ? s.line : "" }];
    }));
    const q = raw.qualify || {};
    return {
      headline: clean(raw.headline, 200), steps,
      qualify: { status: ST.includes(q.status) ? q.status : "missed", asked: Array.isArray(q.asked) ? [...new Set(q.asked.filter(a => ASKED.includes(a)))] : [], note: clean(q.note, 400) },
      best: clean(raw.best, 300), fix: clean(raw.fix, 300),
      showup: ["solid", "shaky", "no", "na"].includes(raw.showup) ? raw.showup : "na"
    };
  }

  const CALL = { Q: "Q (full gift)", CT: "CT (half gift)", NQ: "NQ (no gift)", "?": "didn't find out" };
  /* Everything the coach reads about one chat. The promoter never saw the couple's facts. */
  function coachInput(c, log, call){
    const name = w => (c.people[w === "B" ? 1 : 0] || c.people[0]).name;
    const chat = [];
    let last = null;
    for (const e of log){
      if ("o" in e){ chat.push(`OPC: ${e.o}`); continue; }
      last = e.c;
      for (const l of e.c.lines) chat.push(`${name(l.who)}: ${l.text}`);
      if (Number.isFinite(e.c.interest)) chat.push(`   ${e.c.cue ? `(${e.c.cue}) ` : ""}[interest ${e.c.interest}, real intent ${e.c.intent}${e.c.booked ? ", booked" : ""}]`);
      else if (e.c.booked) chat.push("   [booked]");
    }
    const end = !last ? "The promoter ended it before the couple said anything."
      : last.state === "left" ? "The couple walked away."
      : last.state === "ended" ? `They parted on good terms, ${last.booked ? "booked" : "not booked"}.`
      : `The promoter ended the chat while it was still going, ${last.booked ? "with the couple booked" : "without a booking"}.`;
    return [
      "THE COUPLE (the promoter didn't see this)",
      `${c.people.map((p, i) => `${i ? "B" : "A"}: ${p.name}, ${p.age}, ${p.job || "doesn't work"}`).join(". ")}. ${c.together === "single" ? "Traveling alone" : c.together === "married" ? "Married" : "Living together"}. From ${fromText(c)}.`,
      `Staying at ${c.stay} ${c.leave} ${c.plans} Card: ${c.card === "debit" ? "debit only" : c.card}. ${c.speak}`,
      c.extra.length ? `Other facts: ${c.extra.join(" ")}` : "",
      `Mood: ${c.mood}. Objections they had in mind: ${c.objections.length ? c.objections.join(" / ") : "none"}. Yes-sayers: ${c.fake ? "yes" : "no"}.`,
      `Their real gift: ${c.grade}. Why: ${c.why}`,
      c.canBook ? (c.bookNote ? `Timing: ${c.bookNote}` : "Timing: tomorrow at 8 works.") : `Timing: they can't come. ${c.bookNote}`,
      "",
      `THE PROMOTER'S CALL: asked after the chat which gift this couple qualifies for, they said: ${CALL[call] || CALL["?"]}.`,
      `HOW IT ENDED: ${end}`,
      "",
      `THE CHAT (in ${c.lang === "es" ? "Spanish" : "English"}; after each couple turn: what the promoter could see, then the couple's hidden interest and real intent)`,
      ...chat
    ].filter(s => s !== "").join("\n");
  }
  /* The Claude-version path: one user turn with the rules, the chat and the format. */
  const coachPrompt = (c, log, call) => `${COACH_RULES}\n\n${coachInput(c, log, call)}\n\n${COACH_FORMAT}`;

  const timelineOf = log => log.filter(e => "c" in e && Number.isFinite(e.c.interest)).map(e => [e.c.interest, e.c.intent]);
  function endOf(log){ const t = log.filter(e => "c" in e); const last = t[t.length - 1]; return last ? { state: last.c.state, booked: last.c.booked } : { state: "talking", booked: false }; }

  return { FOCUS, MOOD_LABEL, seeded, bandUSA, bandLat, bandArg, rules, makeCouple, intended, brief, sceneOut, revealOut,
    COUPLE_RULES, TURN_FORMAT, TURN_SCHEMA, normReply, toMessages, sampleTurns, liveInstructions, liveLog, LIVE_STATUS_TOOL,
    LINES, LINE_IDS, STEP_KEYS, ASKED, COACH_RULES, COACH_FORMAT, COACH_SCHEMA, normCoach, coachInput, coachPrompt, timelineOf, endOf };
})();
