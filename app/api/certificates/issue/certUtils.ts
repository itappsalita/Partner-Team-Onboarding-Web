import PizZip from "pizzip";
import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";
import QRCode from "qrcode";

export async function generateCertificatePdf(data: {
  NO_SERTIFIKAT: string;
  EMPLOYEE_NAME: string;
  KTP: string;
  OCCUPATION: string;
  Date_Training: string;
  Tanggal_Sertifikat: string;
}) {
  const templatePath = path.join(process.cwd(), "app", "api", "certificates", "issue", "Template Sertifikat Internal.docx");

  if (!fs.existsSync(templatePath)) {
    throw new Error("Template file not found at " + templatePath);
  }

  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);

  // 1. Extract ALL Images and categorize them
  const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith("word/media/"));
  const allImages: { [key: string]: string } = {};
  const imageList: { name: string, size: number, data: Buffer }[] = [];

  for (const f of mediaFiles) {
    const fileObj = zip.file(f);
    if (!fileObj) continue;
    const buf = fileObj.asNodeBuffer();
    allImages[f] = buf.toString("base64");
    imageList.push({ name: f, size: buf.length, data: buf });
  }

  // Sorting to find candidates
  const sortedBySize = [...imageList].sort((a, b) => b.size - a.size);

  // Background Pattern (Subtle texture)
  const background = sortedBySize.find(img => img.name.endsWith(".jpeg"))?.name || "";

  // Alita Wordmark (Standard v13)
  const alitaLogo = sortedBySize.find(img => img.name.includes("image13") || img.name.includes("image1"))?.name || "";

  // Specific Footer Logo (image11.png as requested)
  const alitaFooterLogo = imageList.find(img => img.name.includes("image11"))?.name || alitaLogo;

  // BORDER RECONSTRUCTION
  // These are the 4 main corner elements ($530 x 662$ range)
  const corners = imageList.filter(img => img.name.endsWith(".png") && img.size > 30000 && img.size < 80000);

  // Mapping based on observation from gallery.html and typical Word export order:
  // image4/10: Top gold corners
  // image3/9: Bottom orange large triangles
  const topLeft = corners.find(i => i.name.includes("image4"))?.name || corners[1]?.name || "";
  const topRight = corners.find(i => i.name.includes("image10"))?.name || corners[3]?.name || "";
  const botLeft = corners.find(i => i.name.includes("image3"))?.name || corners[0]?.name || "";
  const botRight = corners.find(i => i.name.includes("image9"))?.name || corners[2]?.name || "";

  // Generate QR Code for footer
  const qrText = "Generate by Partner team Onboarding Apps";
  const qrDataUrl = await QRCode.toDataURL(qrText, {
    margin: 1,
    width: 200,
    color: {
      dark: "#000000",
      light: "#ffffff"
    }
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 0; }
        body {
          margin: 0; padding: 0;
          display: flex; justify-content: center; align-items: center;
          background-color: #555;
          -webkit-print-color-adjust: exact;
          font-family: 'Inter', sans-serif;
        }
        .container {
          width: 210mm; height: 297mm;
          background-image: url("data:image/jpeg;base64,${allImages[background]}");
          background-size: 100% 100%;
          position: relative;
          background-color: white;
          box-sizing: border-box;
          overflow: hidden;
          display: flex; flex-direction: column; align-items: center;
          padding: 35mm 25mm 20mm 25mm;
        }
        
        /* BORDER LINES - THE FRAME */
        .page-frame {
          position: absolute;
          top: 12mm; left: 12mm; right: 12mm; bottom: 12mm;
          border: 0.4pt solid #997744; /* Brownish gold line */
          z-index: 5;
          pointer-events: none;
        }

        /* ORNAMENTS - SYMMETRIC MIRRORING FOR BOTTOM ONLY */
        .ornament { position: absolute; pointer-events: none; z-index: 10; }
        .ob-l { bottom: 0; left: 0; width: 88mm; transform: translate(-4mm, 4mm); }
        .ob-r { bottom: 0; right: 0; width: 88mm; transform: translate(4mm, 4mm) scaleX(-1); }

        /* HEADER LOGO - ALIGNED WITH FRAME LINES (v13 REVERT) */
        .logo-top { 
          position: absolute;
          top: 0; left: 3.2mm;
          width: calc(100% - 6.4mm); height: auto;
          z-index: 10;
        }

        .title-group { text-align: center; margin-top: 15mm; z-index: 10; }
        .title-main {
          color: #E67E22;
          font-size: 62pt;
          font-weight: 400;
          margin: 0;
          line-height: 1.1;
          letter-spacing: 1pt;
          font-family: 'Playfair Display', serif;
        }
        .title-sub {
          color: #444;
          font-size: 22pt;
          font-weight: 700;
          margin: -5pt 0 0 0;
          letter-spacing: 11pt;
          text-transform: uppercase;
        }
        .cert-no {
          font-size: 12.5pt;
          margin-top: 10pt;
          color: #222;
          font-weight: 600;
          text-align: center;
          letter-spacing: 0.5pt;
        }
        .body-text {
          margin-top: 25pt;
          width: 92%;
          color: #333;
          font-size: 11.2pt;
          line-height: 1.45;
          z-index: 10;
        }
        .intro { margin-bottom: 18pt; }
        
        .info-table {
          margin: 0 0 25pt 0;
          font-size: 11.5pt;
          border-collapse: collapse;
        }
        .info-table td { padding: 4.5pt 0; vertical-align: top; }
        .info-table td.label { width: 95px; }
        .info-table td.colon { width: 30px; text-align: center; }
        .info-table td.val { font-weight: 600; }

        .training-info { margin-top: 15pt; line-height: 1.6; }
        .training-title { font-weight: bold; font-style: italic; color: #000; }

        .objectives {
          margin-top: 25pt;
        }
        .obj-title { font-weight: 600; margin-bottom: 10pt; }
        .obj-item { display: flex; margin-bottom: 7pt; text-align: justify; line-height: 1.4; }
        .obj-no { width: 25px; flex-shrink: 0; }

        .footer {
          margin-top: auto;
          text-align: center;
          width: 100%;
          padding-bottom: 22mm;
          z-index: 15;
        }
        .date-loc { font-size: 11.2pt; margin-bottom: 25pt; font-weight: 500; }
        .logo-bottom { height: 18mm; width: 18mm; margin: 0 auto 12pt; display: block; }
        .sign-name { font-weight: 700; font-size: 11.5pt; margin-bottom: 2pt; text-decoration: underline; }
        .sign-title { font-size: 11pt; color: #444; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- FRAME & SYMMETRIC ORNAMENTS (BOTTOM ONLY) -->
        <div class="page-frame">
          <img class="ornament ob-l" src="data:image/png;base64,${allImages[botLeft]}" />
          <img class="ornament ob-r" src="data:image/png;base64,${allImages[botLeft]}" />
        </div>

        <img class="logo-top" src="data:image/png;base64,${allImages[alitaLogo]}" />
        
        <div class="title-group">
          <h1 class="title-main">CERTIFICATE</h1>
          <div class="title-sub">OF COMPLETION</div>
        </div>
        
        <div class="cert-no">NO: ${data.NO_SERTIFIKAT}</div>

        <div class="body-text">
          <div class="intro">Dengan ini menyatakan bahwa:</div>
          
          <table class="info-table">
            <tr>
              <td class="label">Nama</td>
              <td class="colon">:</td>
              <td class="val">${data.EMPLOYEE_NAME}</td>
            </tr>
            <tr>
              <td class="label">NIK</td>
              <td class="colon">:</td>
              <td class="val">${data.KTP}</td>
            </tr>
            <tr>
              <td class="label">Jabatan</td>
              <td class="colon">:</td>
              <td class="val">${data.OCCUPATION}</td>
            </tr>
          </table>

          <div class="training-info">
            telah mengikuti dan menyelesaikan program pelatihan:<br/>
            <span class="training-title">“Pelatihan Teknis Instalasi dan Pemahaman Perangkat Microwave”</span><br/>
            yang diselenggarakan oleh <strong>PT Alita Praya Mitra</strong>, pada tanggal ${data.Date_Training}.
          </div>

          <div class="objectives">
            <div class="obj-title">Pelatihan ini bertujuan untuk meningkatkan kompetensi teknis peserta dalam:</div>
            <div class="obj-item"><div class="obj-no">1.</div><div>Pemahaman terhadap prinsip kerja perangkat microwave (termasuk di dalamnya konfigurasi, frekuensi, dan parameter MW).</div></div>
            <div class="obj-item"><div class="obj-no">2.</div><div>Teknis dalam instalasi perangkat Microwave, termasuk pemasangan mounting, alignment, dan pengujian link.</div></div>
            <div class="obj-item"><div class="obj-no">3.</div><div>Standar Kesehatan & Keselamatan Kerja (K3) dan juga kualitas terhadap instalasi sesuai prosedur operasional PT Alita Praya Mitra.</div></div>
          </div>
        </div>

        <div class="footer">
          <div class="date-loc">Jakarta, ${data.Tanggal_Sertifikat}</div>
          <img class="logo-bottom" src="${qrDataUrl}" />
          <div class="sign-name">Mimin Aminah</div>
          <div class="sign-title">Direktur Operasional</div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Launch Puppeteer to print to PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    landscape: false,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();
  return pdfBuffer;
}

export function getRomanMonth(month: number): string {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return roman[month - 1] || "";
}
