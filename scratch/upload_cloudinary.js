const fs = require('fs');
const path = require('path');

const CLOUD_NAME = 'ddbti1112';
const API_KEY = '763334958941215';
const API_SECRET = '2umW5FqDTV-P2knCxn4pOKWT790';

async function uploadToCloudinary(filePath, folder) {
  const fileName = path.parse(filePath).name;
  
  // Create form data manually since Node < 18 doesn't have it natively, 
  // but wait, we are in Node 20 (based on package.json @types/node^20).
  // So we can use FormData and fetch.
  const formData = new FormData();
  
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  
  formData.append('file', blob, path.basename(filePath));
  // Actually, we can use signed uploads without upload_preset
  
  const timestamp = Math.round((new Date).getTime()/1000);
  const crypto = require('crypto');
  const strToSign = `folder=${folder}&public_id=${fileName}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash('sha1').update(strToSign).digest('hex');
  
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('public_id', fileName);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Upload failed for ${fileName}: ${error}`);
  }
  
  const data = await res.json();
  return data;
}

async function main() {
  const dirPath = path.join(process.cwd(), 'ejemplos', 'firmas');
  const files = fs.readdirSync(dirPath);
  
  let subidas = 0;
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isFile()) {
      try {
        console.log(`Subiendo ${file}...`);
        await uploadToCloudinary(filePath, 'firmas/trabajadors');
        console.log(`  ✅ Subida exitosa: ${file}`);
        subidas++;
      } catch (err) {
        console.log(`  ❌ Error subiendo ${file}: ${err.message}`);
      }
    }
  }
  console.log(`\n¡Se subieron ${subidas} firmas a Cloudinary!`);
}

main();
