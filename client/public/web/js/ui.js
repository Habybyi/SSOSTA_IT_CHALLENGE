/* Menu a posuvník pred/po */
// navigation
$("#bg").onclick = () => $("#nav").classList.toggle("open");
$$("#nav a").forEach((a) => (a.onclick = () => $("#nav").classList.remove("open")));
// before/after
$("#ba input").oninput = (e) => $("#ba").style.setProperty("--p", e.target.value + "%");

// Prepínač svetlý / tmavý režim (zapamätá sa v prehliadači)
$("#theme").onclick = () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch (e) {}
  if (typeof draw === "function") draw();
};
