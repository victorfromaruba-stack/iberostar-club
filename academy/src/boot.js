/* =====================================================================
   BOOT
   The team link with #team at the end opens the manager panel.
   #rp=... comes from the Claude version: a Street practice score to add here.
   ===================================================================== */
buildTabs();
if (location.hash === "#team") coach();
else if (rpImport()) tab("games");
else tab(S.tab);
addEventListener("hashchange", () => { if (location.hash === "#team") coach(); else if (rpImport()) tab("games"); });
if (S.name) queueSync();
