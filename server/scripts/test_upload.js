import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const LOGIN_URL = 'http://localhost:5000/api/users/login';
const UPLOAD_URL = 'http://localhost:5000/api/users/hospital/events';

(async () => {
  try {
    const loginResp = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hospital@gmail.com', password: 'hospital123' }),
    });
    const loginJson = await loginResp.json();
    if (!loginResp.ok) {
      console.error('Login failed', loginJson);
      process.exit(1);
    }
    const token = loginJson.token;
    console.log('Got token:', token);

    const form = new FormData();
  const data = { type: 'birth', data: { childNameEn: 'Node Test Child', childNameAm: 'ነድ ልጅ' } };
    form.append('data', JSON.stringify(data));
    const filePath = 'c:/Users/Jonah/Desktop/vital-events/server/uploads/profilePic-1758192412755.jpg';
    form.append('file', fs.createReadStream(filePath));

    const uploadResp = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const uploadJson = await uploadResp.json();
    console.log('Upload response:', uploadResp.status, uploadJson);
  } catch (err) {
    console.error('Error in test script', err);
  }
})();
