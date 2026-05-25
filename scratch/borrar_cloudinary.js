const https = require('https');
const fs = require('fs');
const path = require('path');

const CLOUD_NAME = 'ddbti1112';
const API_KEY = '763334958941215';
const API_SECRET = '2umW5FqDTV-P2knCxn4pOKWT790';

// Lista de public_ids que subimos
const publicIds = [
  'firmas/trabajadors/anderson_posso',
  'firmas/trabajadors/cristian_camilo_bedoya',
  'firmas/trabajadors/diana_hungria',
  'firmas/trabajadors/edilvey_castillo',
  'firmas/trabajadors/edward_steven_martinez',
  'firmas/trabajadors/frank_robert_vergara',
  'firmas/trabajadors/gabriel_guerrrero',
  'firmas/trabajadors/heber_cardenas',
  'firmas/trabajadors/joeldrix_toro',
  'firmas/trabajadors/kensy_franco',
  'firmas/trabajadors/leider_tintinago',
  'firmas/trabajadors/michael_paz',
  'firmas/trabajadors/nicolle_martinez',
  'firmas/trabajadors/rodrigo_porras',
  'firmas/trabajadors/valeri_chocue',
  'firmas/trabajadors/yordan_lita',
];

function deleteFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    const postData = `public_id=${encodeURIComponent(publicId)}`;

    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: `/v1_1/${CLOUD_NAME}/image/destroy`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Basic ${auth}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log(`Eliminando ${publicIds.length} firmas de Cloudinary...\n`);
  
  let eliminadas = 0;
  for (const id of publicIds) {
    try {
      const result = await deleteFromCloudinary(id);
      const body = JSON.parse(result.body);
      if (body.result === 'ok') {
        console.log(`  ✅ Eliminada: ${id}`);
        eliminadas++;
      } else {
        console.log(`  ⚠️ ${id}: ${body.result}`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${id} - ${err.message}`);
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Eliminadas: ${eliminadas}/${publicIds.length}`);
}

main();
