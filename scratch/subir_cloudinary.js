const fs = require('fs');
const path = require('path');
const https = require('https');

const CLOUD_NAME = 'ddbti1112';
const API_KEY = '763334958941215';
const API_SECRET = '2umW5FqDTV-P2knCxn4pOKWT790';
// Guardaremos en la carpeta firmas generales o trabajadors (para que lo lea tu sistema)
const FOLDER = 'firmas/trabajadors';

const firmasDir = path.join(__dirname, '..', 'ejemplos', 'firmas');

async function uploadToCloudinary(filePath, publicId) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now();
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    // Determinar tipo de imagen
    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const fields = [
      { name: 'file', filename: fileName, buffer: fileBuffer, contentType: contentType },
      { name: 'upload_preset', value: '' },
      { name: 'public_id', value: publicId },
      { name: 'folder', value: FOLDER },
      { name: 'overwrite', value: 'true' },
    ];

    let body = Buffer.alloc(0);
    for (const field of fields) {
      let header;
      if (field.buffer) {
        header = `--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"; filename="${field.filename}"\r\nContent-Type: ${field.contentType}\r\n\r\n`;
        body = Buffer.concat([body, Buffer.from(header), field.buffer, Buffer.from('\r\n')]);
      } else {
        header = `--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"\r\n\r\n${field.value}\r\n`;
        body = Buffer.concat([body, Buffer.from(header)]);
      }
    }
    body = Buffer.concat([body, Buffer.from(`--${boundary}--\r\n`)]);

    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'Authorization': `Basic ${auth}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(firmasDir)) {
    console.log(`La carpeta ${firmasDir} no existe.`);
    return;
  }

  const files = fs.readdirSync(firmasDir).filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'));
  
  console.log(`Encontradas ${files.length} firmas para subir desde ${firmasDir}.\n`);

  let subidas = 0;
  let errores = 0;

  for (const file of files) {
    // El nombre del archivo sin extensión (ej: "Granada Jhoan Sebastian")
    const nombreOriginal = path.basename(file, path.extname(file));
    
    // Cloudinary prefiere public_ids sin espacios, los cambiamos por _
    // Cuando lo descarguemos en listar-firmas, se volverán a mostrar con espacios
    const publicId = nombreOriginal.replace(/\s+/g, '_');
    const filePath = path.join(firmasDir, file);
    
    try {
      console.log(`Subiendo: ${nombreOriginal}...`);
      const result = await uploadToCloudinary(filePath, publicId);
      console.log(`  ✅ OK → ${result.secure_url}`);
      subidas++;
    } catch (err) {
      console.log(`  ❌ Error: ${err.message.substring(0, 100)}`);
      errores++;
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Subidas exitosas: ${subidas}`);
  console.log(`Errores: ${errores}`);
}

main();
