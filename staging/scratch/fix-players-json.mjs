import fs from "fs";

const filePath = "public/players.json";
const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));

const textReplacements = new Map([
  ["Esp�rance", "Esperance"],
  ["Gy�ri", "Gyori"],
  ["A�T", "AIT"],
  ["Atl�tico", "Atletico"],
  ["Atl�tico Nacional", "Atletico Nacional"],
  ["Atl�tico Mineiro", "Atletico Mineiro"],
  ["Br�ndby", "Brondby"],
  ["M�nchen", "Munchen"],
  ["M�nchengladbach", "Monchengladbach"],
  ["Gr�mio", "Gremio"],
  ["Fenerbah�e", "Fenerbahce"],
  ["Pusk�s", "Puskas"],
  ["Akad�mia", "Akademia"],
  ["Castell�n", "Castellon"],
  ["Li�ge", "Liege"],
  ["�aykur", "Caykur"],
  ["Nordsj�lland", "Nordsjaelland"],
  ["K�benhavn", "Kobenhavn"],
  ["Z�rich", "Zurich"],
  ["V�lez Sars eld", "Velez Sarsfield"],
  ["?�d?", "Lodz"],
  ["Malm�", "Malmo"],
  ["Norrk�ping", "Norrkoping"],
  ["Le�n", "Leon"],
  ["S�o", "Sao"],
  ["Am�rica", "America"],
  ["Hurac�n", "Huracan"],
  ["Porte�o", "Porteno"],
  ["�K", "SK"],
  ["Ju�rez", "Juarez"],
  ["Cat�lica", "Catolica"],
  ["Bod�", "Bodo"],
  ["Mj�llby", "Mjallby"],
  ["T�rkiye", "Turkiye"],
  ["Cura�ao", "Curacao"],
  ["C�te D'Ivoire", "Cote D'Ivoire"],
  ["Kr�lov�", "Kralove"],
  ["D�sseldorf", "Dusseldorf"],
  ["Ferencv�rosi", "Ferencvarosi"],
  ["Pre�ov", "Presov"],
  ["Montb�liard", "Montbeliard"],
  ["Nicol�s", "Nicolas"],
  ["Agust�n", "Agustin"],
  ["Juli�n", "Julian"],
  ["Andr�s", "Andres"],
  ["Mart�nez", "Martinez"],
  ["�LVAREZ", "ALVAREZ"],
  ["Dami�n", "Damian"],
  ["Jerem�as", "Jeremias"],
  ["Fern�ndez", "Fernandez"],
  ["Jo�o", "Joao"],
  ["Jos�", "Jose"],
  ["M�rcio", "Marcio"],
  ["H�lio", "Helio"],
  ["Mo�se", "Moise"],
  ["G�d�on", "Gedeon"],
  ["Ga�l", "Gael"],
  ["Aur�lien", "Aurelien"],
  ["R�sh�n", "Rashon"],
  ["J�rgen", "Jurgen"],
  ["Nathana�l", "Nathanael"],
  ["Aur�le", "Aurele"],
  ["Jean-K�vin", "Jean-Kevin"],
  ["Ra�l", "Raul"],
  ["C�sar", "Cesar"],
  ["�lvaro", "Alvaro"],
  ["Orbel�n", "Orbelin"],
  ["Jes�s", "Jesus"],
  ["Mois�s", "Moises"],
  ["F�lix", "Felix"],
  ["Qui�onez", "Quinonez"],
  ["Fran�ois", "Francois"],
  ["Th�o", "Theo"],
  ["D�sir�", "Desire"],
  ["C�dric", "Cedric"],
  ["R�DIGER", "RUDIGER"],
  ["GRO�", "GROSS"],
  ["SAN�", "SANE"],
  ["N�BEL", "NUBEL"],
  ["KONAT�", "KONATE"],
  ["ZA�RE-EMERY", "ZAIRE-EMERY"],
  ["Lindel�f", "Lindelof"],
  ["Lindel�F", "LINDELOF"],
  ["GY�KERES", "GYOKERES"],
  ["C�MERT", "COMERT"],
  ["S�NCHEZ", "SANCHEZ"],
  ["V�SQUEZ", "VASQUEZ"],
  ["M�NDEZ", "MENDEZ"],
  ["GONZ�LEZ", "GONZALEZ"],
  ["B�RCENAS", "BARCENAS"],
  ["C�CERES", "CACERES"],
  ["GIM�NEZ", "GIMENEZ"],
  ["NU�EZ", "NUNEZ"],
  ["VI�A", "VINA"],
  ["Gon�alo", "Goncalo"],
  ["In�cio", "Inacio"],
  ["Trinc�o", "Trincao"],
  ["Concei��o", "Conceicao"],
  ["Le�o", "Leao"],
  ["R�ben", "Ruben"],
  ["Tom�s", "Tomas"],
  ["Jo�o", "Joao"],
  ["F�lix", "Felix"],
  ["Sim�n", "Simon"],
  ["Cubars�", "Cubarsi"],
  ["Fran�ois", "Francois"],
]);

function replaceText(str) {
  let out = str;
  for (const [bad, good] of textReplacements) {
    out = out.split(bad).join(good);
  }
  out = out.replace(/ï¿½/g, "");
  out = out.replace(/�/g, "");
  out = out.replace(/\?/g, "");
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

function splitPlayerName(playerName) {
  const tokens = (playerName || "").trim().split(/\s+/).filter(Boolean);
  const firstNameIndex = tokens.findIndex((token) => /[a-z]/.test(token));
  if (firstNameIndex === -1) {
    return { first: "", last: tokens.join(" ") };
  }
  return {
    last: tokens.slice(0, firstNameIndex).join(" "),
    first: tokens.slice(firstNameIndex).join(" "),
  };
}

function makeShirtName(row) {
  const current = row["Name on Shirt"] || "";
  const { first, last } = splitPlayerName(row["Player Name"]);
  const firstTokens = first.split(/\s+/).filter(Boolean);
  const lastTokens = last.split(/\s+/).filter(Boolean);
  const currentTokens = current.split(/\s+/).filter(Boolean);

  if (!currentTokens.length) {
    return replaceText((lastTokens[lastTokens.length - 1] || firstTokens[0] || row["Player Name"] || "").toUpperCase());
  }

  if (currentTokens.length === 1) {
    if (currentTokens[0].includes(".")) {
      const initial = firstTokens[0]?.[0]?.toUpperCase() || "";
      const surname = (lastTokens[lastTokens.length - 1] || "").toUpperCase();
      return replaceText(`${initial}. ${surname}`.trim());
    }
    const source = firstTokens[0] || lastTokens[lastTokens.length - 1] || currentTokens[0];
    return replaceText(source.toUpperCase());
  }

  if (currentTokens[0].includes(".")) {
    const initial = firstTokens[0]?.[0]?.toUpperCase() || currentTokens[0].replace(/[^A-Z.]/g, "");
    const surname = (lastTokens[lastTokens.length - 1] || currentTokens[currentTokens.length - 1] || "").toUpperCase();
    return replaceText(`${initial}. ${surname}`.trim());
  }

  if (currentTokens.length === 2) {
    const firstToken = (firstTokens[0] || currentTokens[0]).toUpperCase();
    const secondToken = (lastTokens[lastTokens.length - 1] || currentTokens[1]).toUpperCase();
    return replaceText(`${firstToken} ${secondToken}`.trim());
  }

  return replaceText(current.toUpperCase());
}

for (const row of rows) {
  for (const key of ["Team", "Coach Nationality", "Club", "Player Name"]) {
    if (typeof row[key] === "string" && /[�?]/.test(row[key])) {
      row[key] = replaceText(row[key]);
    }
  }

  const split = splitPlayerName(row["Player Name"]);

  if (typeof row["First Name(s)"] === "string" && /[�?]/.test(row["First Name(s)"])) {
    row["First Name(s)"] = replaceText(split.first || row["First Name(s)"]);
  }

  if (typeof row["Last Name(s)"] === "string" && /[�?]/.test(row["Last Name(s)"])) {
    row["Last Name(s)"] = replaceText((split.last || row["Last Name(s)"]).toUpperCase());
  }

  if (typeof row["Name on Shirt"] === "string" && /[�?]/.test(row["Name on Shirt"])) {
    row["Name on Shirt"] = makeShirtName(row);
  }

  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && value.includes("�")) {
      row[key] = replaceText(value);
    }
  }
}

fs.writeFileSync(filePath, `${JSON.stringify(rows, null, 2)}\n`);
