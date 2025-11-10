// ...existing code...
import { format } from 'date-fns';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ToWords } from 'to-words';

export async function generatePdf(data: {
  employee_name: string;
  start_date: string;
  employee_designation_name: string;
  employee_department_name: string;
  total_salary: number;
}): Promise<Uint8Array> {
  const toWords = new ToWords();

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Embed the standard fonts
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Add a page to the document (A4)
  const page = pdfDoc.addPage([595.28, 841.89]);

  const { width, height } = page.getSize();

  // Small helper for formatting numbers
  // const formatAmount = (n: number) =>
  //   new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));

  // Header: Date (top-left)
  const dateStr = format(new Date(), 'dd MMM, yyyy');
  page.drawText(`Date: ${dateStr}`, {
    x: 50,
    y: height - 30,
    size: 10,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Title: centered, bold, underlined
  const title = 'To Whom It May Concern';
  const titleSize = 16;
  const titleWidth = timesRomanBold.widthOfTextAtSize(title, titleSize);
  const titleX = (width - titleWidth) / 2;
  const titleY = height - 80;
  page.drawText(title, {
    x: titleX,
    y: titleY,
    size: titleSize,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });
  // underline
  page.drawLine({
    start: { x: titleX, y: titleY - 6 },
    end: { x: titleX + titleWidth, y: titleY - 6 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Intro paragraph (wrapped)
  const introText = `This is to certify that ${data.employee_name} has been working with us since ${format(
    new Date(data.start_date),
    'dd MMM, yy',
  )} as a permanent employee. His present position in the company is ${data.employee_designation_name}, ${data.employee_department_name} at BWT. His monthly salary and allowance are as follows:`;
  const introFontSize = 11;
  const introX = 50;
  const introY = titleY - 30;
  const introMaxWidth = width - 100;
  page.drawText(introText, {
    x: introX,
    y: introY,
    size: introFontSize,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
    maxWidth: introMaxWidth,
    lineHeight: 14,
  });

  // Salary breakdown table
  const tableStartY = introY - 70;
  const tableX = 50;
  const tableWidth = width - 100;
  const amountColWidth = 120;
  const labelColWidth = tableWidth - amountColWidth;
  const rowHeight = 22;

  const salaryDetails: [string, number][] = [
    ['Basic Salary', data.total_salary * 0.5],
    ['House Rent', data.total_salary * 0.3],
    ['Conveyance Allowance', data.total_salary * 0.1],
    ['Medical Allowance', data.total_salary * 0.1],
    ['Total Take Home Salary', data.total_salary],
  ];

  // calculate inner table bounds
  const tableTopY = tableStartY;
  const tableInnerTop = tableTopY; // top line sits at tableStartY
  const tableInnerBottom = tableTopY - rowHeight * salaryDetails.length;

  // draw only horizontal lines (no outer rectangle, no vertical divider) -----------------------
  // draw top + separators + bottom (one pass)
  for (let i = 0; i <= salaryDetails.length; i++) {
    const y = tableInnerTop - i * rowHeight;
    page.drawLine({
      start: { x: tableX, y },
      end: { x: tableX + tableWidth, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  // Draw row texts (centered in each column)
  const fontSize = 11;
  for (let i = 0; i < salaryDetails.length; i++) {
    const [label, amount] = salaryDetails[i];
    const rowTop = tableInnerTop - i * rowHeight;
    // vertical center for text inside the row
    const textY = rowTop - rowHeight / 2 - fontSize / 2 + 6;

    // label: center horizontally in label column
    const labelTextWidth = timesRomanFont.widthOfTextAtSize(label, fontSize);
    const labelCenterX = tableX + labelColWidth / 2;
    const labelX = labelCenterX - labelTextWidth / 2;
    page.drawText(label, {
      x: labelX,
      y: textY,
      size: fontSize,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
      maxWidth: labelColWidth - 8,
    });

    // amount: center horizontally in amount column (no thousand separators)
    const amountText = Math.round(amount).toString();
    const amountTextWidth = timesRomanFont.widthOfTextAtSize(amountText, fontSize);
    const amountColStart = tableX + labelColWidth;
    const amountCenterX = amountColStart + amountColWidth / 2;
    const amountX = amountCenterX - amountTextWidth / 2;
    page.drawText(amountText, {
      x: amountX,
      y: textY,
      size: fontSize,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
  }

  // Add "In words" below table
  const wordsRaw = toWords.convert(Math.round(data.total_salary));
  const words = wordsRaw.charAt(0).toUpperCase() + wordsRaw.slice(1);
  page.drawText(`In words: Taka ${words}`, {
    x: 50,
    y: tableInnerBottom - 30,
    size: 11,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Footer / signature area (moved further down)
  const tableBottomY = tableInnerBottom;
  const footerY = tableBottomY - 160; // adjust to push signature further down

  page.drawLine({
    start: { x: 50, y: footerY + 18 },
    end: { x: 200, y: footerY + 18 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawText('Approved By', {
    x: 50,
    y: footerY - 6,
    size: 11,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });
  page.drawText('Manager', {
    x: 50,
    y: footerY - 26,
    size: 11,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });
  page.drawText('Human Resource & Admin', {
    x: 50,
    y: footerY - 46,
    size: 11,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Serialize the PDF document to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
// ...existing code...
