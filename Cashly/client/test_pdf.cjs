const { jsPDF } = require("jspdf");
const fs = require("fs");

const base64Code = fs.readFileSync("./src/lib/pdfFont.js", "utf-8");
const match = base64Code.match(/"([^"]+)"/);
const base64 = match[1];

const doc = new jsPDF();
doc.addFileToVFS('Roboto-Regular.ttf', base64);
doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
doc.setFont('Roboto');

doc.text("Rupee test: ₹ 15,000", 10, 10);
const output = doc.output('arraybuffer');
fs.writeFileSync('test.pdf', Buffer.from(output));
console.log("PDF generated.");
