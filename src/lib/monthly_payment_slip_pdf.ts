import type { Buffer } from 'node:buffer'; // Explicitly import Buffer
import type { TDocumentDefinitions } from 'pdfmake/interfaces'; // Import type for document definition

import { format } from 'date-fns';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts'; // This is the vfs data
import { ToWords } from 'to-words';

// Assign the virtual file system for fonts
// The 'pdfFonts' import is the object that contains the 'vfs' property.
pdfMake.vfs = pdfFonts.vfs;

pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

export async function generatePdf(data: {
  employee_name: string;
  start_date: string;
  employee_designation_name: string;
  employee_department_name: string;
  total_salary: number;
}): Promise<Buffer> {
  const DEFAULT_FONT_SIZE = 11;
  const xMargin = 30;
  const headerHeight = 100;
  const footerHeight = 20;
  const toWords = new ToWords();

  // Define the PDF document structure
  const pdfDocDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [xMargin, headerHeight, xMargin, footerHeight],
    defaultStyle: {
      fontSize: DEFAULT_FONT_SIZE,
    },
    info: {
      title: `Monthly Salary - ${data.employee_name} - ${new Date().toISOString()}`,
      author: 'Bismillash World Technology',
    },
    header: {
      columns: [{ text: `Date: ${format(new Date(), 'dd MMM, yyyy')}`, alignment: 'left', fontSize: 9 }],
      margin: [40, 40],
    },
    content: [
      {
        text: 'To Whom It May Concern',
        fontSize: DEFAULT_FONT_SIZE + 4,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 30],
        decoration: 'underline',
      },
      {
        text: `This is to certify that ${data.employee_name} has been working with us since ${format(new Date(data.start_date), 'dd MMM, yy')} as a permanent employee. His present position in the company is ${data.employee_designation_name}, ${data.employee_department_name} at BWT. His monthly salary and allowance are as follows:`,
        fontSize: DEFAULT_FONT_SIZE,
        alignment: 'justify',
        margin: [0, 0, 0, 30],
      },
      {
        style: 'tableExample',
        alignment: 'center',
        table: {
          headerRows: 0,
          widths: ['*', '*'],
          body: [
            ['Basic Salary', data.total_salary * 0.5],
            ['House Rent', data.total_salary * 0.3],
            ['Conveyance Allowance', data.total_salary * 0.1],
            ['Medical Allowance', data.total_salary * 0.1],
            ['Total Take Home Salary', data.total_salary],
          ],
        },
        layout: {
          hLineWidth(i: number, node: any) {
            return i === 0 || i === node.table.body.length ? 1 : 1;
          },
          vLineWidth(i: number, node: any) {
            return i === 0 || i === node.table.widths?.length ? 0 : 0;
          },
        },
        margin: [0, 0, 0, 30],
      },
      {
        text: `In words: Taka ${toWords.convert(data.total_salary)}`,
        fontSize: DEFAULT_FONT_SIZE,
        margin: [0, 0, 0, 30],
      },
      {
        text: '---------------------------',
        fontSize: DEFAULT_FONT_SIZE,
        margin: [0, 100, 0, 10],
      },
      {
        text: 'Approved By',
        fontSize: DEFAULT_FONT_SIZE,
        margin: [0, 0, 0, 10],
      },
      {
        text: 'Manager',
        fontSize: DEFAULT_FONT_SIZE,
        margin: [0, 0, 0, 10],
      },
      {
        text: 'Human Resource & Admin',
        fontSize: DEFAULT_FONT_SIZE,
        margin: [0, 0, 0, 10],
      },
    ],
  };

  // Generate the PDF as a Buffer
  const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
    // Use getBuffer method
    pdfMake.createPdf(pdfDocDefinition).getBuffer((buffer: Buffer) => {
      if (buffer) {
        resolve(buffer);
      }
      else {
        reject(new Error('Failed to generate PDF buffer'));
      }
    });
  });

  return pdfBuffer;
}
