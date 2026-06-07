function normalize(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const spanishCanonicalOverrides = {
  adios: "adiós",
  arbol: "árbol",
  autobus: "autobús",
  avion: "avión",
  bano: "baño",
  cafe: "café",
  cancion: "canción",
  companera: "compañera",
  companero: "compañero",
  corazon: "corazón",
  dificil: "difícil",
  espanol: "español",
  estacion: "estación",
  facil: "fácil",
  habitacion: "habitación",
  ingles: "inglés",
  lapiz: "lápiz",
  manana: "mañana",
  miercoles: "miércoles",
  nino: "niño",
  nina: "niña",
  pais: "país",
  pequeno: "pequeño",
  sabado: "sábado",
  senor: "señor",
  senora: "señora",
  tambien: "también",
  telefono: "teléfono"
};

function canonicalizeSpanishWord(text) {
  const trimmed = String(text || "").trim().toLowerCase();
  return spanishCanonicalOverrides[normalize(trimmed)] || trimmed;
}

function uniqueNormalized(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { canonicalizeSpanishWord, normalize, uniqueNormalized };
