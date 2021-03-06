const wT = window.plugin.wasabee.static.strings;

const wX = (key, value, option) => {
  const ll = window.navigator.userLanguage || window.navigator.language || "en";
  let l = ll.substring(0, 2);

  // if chosen langauge does not exist, use english
  if (!wT[l]) l = "en";

  // if this key does not exist in the chosen langauge, use english
  let s = wT[l][key] || wT["en"][key];

  // if it doesn't exist in English
  if (!s) return "haec notificatio praebibo est";

  // do any necessary replacements
  if (option) s = s.replace("${option}", option);
  if (value) s = s.replace("${value}", value);
  return s;
};

export default wX;
