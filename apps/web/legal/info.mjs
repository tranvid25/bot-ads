export const LEGAL_PATHS = ["/privacy", "/terms", "/support", "/data-deletion"];
export const updated = "10/11/2026";
export const operator = "XayWebsite";
export const sections = (entries) =>
  entries
    .map(
      ([heading, vi, en]) =>
        `<section class="document-section"><h2>${heading}</h2><p lang="vi">${vi}</p><p lang="en" class="english">${en}</p></section>`,
    )
    .join("\n");
