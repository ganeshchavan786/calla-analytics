async function testLogin(url) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ganesh@vrushaliinfotech.com',
        password: 'Swami@9966333',
        uniqueCode: 'OWN-5250'
      })
    });
    const data = await res.json();
    console.log(`\n[${url}] STATUS: ${res.status}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[${url}] ERROR:`, err.message);
  }
}

async function run() {
  await testLogin('http://localhost:3000/api/mobile/verify');
  await testLogin('https://calllog.vrushaliinfotech.com/api/mobile/verify');
}

run();
