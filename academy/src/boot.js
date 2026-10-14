/* =====================================================================
   BOOT
   The team link with #team at the end opens the manager panel.
   ===================================================================== */
buildTabs();
if (location.hash === "#team") coach(); else tab(S.tab);
addEventListener("hashchange", () => { if (location.hash === "#team") coach(); });
if (S.name) queueSync();
