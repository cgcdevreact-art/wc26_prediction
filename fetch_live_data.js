const http = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function check() {
  try {
    console.log("Fetching live games...");
    const data = await get("https://worldcup26.ir/get/games");
    console.log("Total games returned:", data.games ? data.games.length : "none");
    if (data.games && data.games.length > 0) {
      console.log("First game:", JSON.stringify(data.games[0], null, 2));
      const groupGames = data.games.filter(g => g.type === 'group');
      const koGames = data.games.filter(g => g.type !== 'group');
      console.log("Group games count:", groupGames.length);
      console.log("KO games count:", koGames.length);
      if (koGames.length > 0) {
        console.log("First KO game:", JSON.stringify(koGames[0], null, 2));
      }
    }
  } catch (err) {
    console.error("Error fetching:", err);
  }
}

check();
