export const CERTIFICATE_UPLOAD_LIMIT = 9 * 1024 * 1024;
export const CERTIFICATE_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export function validateCertificateUploads(files: (FormDataEntryValue | null)[]): string | null {
  let total = 0;
  for (const file of files) {
    if (file === null) continue;
    if (typeof file === "string") return "File sertifikat tidak valid.";
    if (!file.name && file.size === 0) continue;
    if (file.size === 0) return "File sertifikat kosong. Pilih file lain.";
    if (!CERTIFICATE_FILE_TYPES.includes(file.type)) {
      return "File sertifikat harus berformat PDF, JPG, atau PNG.";
    }
    total += file.size;
  }
  return total > CERTIFICATE_UPLOAD_LIMIT
    ? "Total ukuran file sertifikat maksimal 9 MB."
    : null;
}
