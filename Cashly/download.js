const fs = require('fs');
const https = require('https');

const url = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';

https.get(url, (res) => {
    const data = [];
    res.on('data', (chunk) => data.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(data);
        const base64 = buffer.toString('base64');
        const fileContent = 'export const robotoBase64 = "' + base64 + '";\n';
        fs.writeFileSync('./client/src/lib/pdfFont.js', fileContent);
        console.log('Font successfully downloaded and converted to base64. Size: ' + base64.length);
    });
}).on('error', (err) => {
    console.error('Error fetching font:', err.message);
});
