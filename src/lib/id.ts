const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

export const createId = (size = 10): string => {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }
  return Array.from({ length: size }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
    ""
  );
};

