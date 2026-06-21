const fs = require('fs');

console.log('Loading cbas_data.json...');
const data = JSON.parse(fs.readFileSync('cbas_data.json', 'utf8'));

// Build CB name index { code: name }
const names = {};
const cbList = data.cbList;
for (let i = 1; i < cbList.length; i++) {
    const code = String(cbList[i][1] || '').trim();
    const name = String(cbList[i][2] || '').trim();
    if (code && name && /^\d+$/.test(code)) names[code] = name;
}
console.log(`Names: ${Object.keys(names).length}`);

// Build per-CB data organized by first digit of code
const chunks = {};

for (const [month, rows] of Object.entries(data.monthly)) {
    if (!Array.isArray(rows)) continue;
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const code = String(row[0] || '').trim();
        if (!code || !/^\d{4,6}$/.test(code)) continue;

        const digit = code[0];
        if (!chunks[digit]) chunks[digit] = {};
        if (!chunks[digit][code]) chunks[digit][code] = [];

        const notional = Number(row[2]) || 0;
        const shares = Math.floor(notional / 100000);
        const avg = Number(row[6]) || 0;
        const premium = Math.round(avg * notional / 100000 / 10000);

        chunks[digit][code].push([
            month,               // 0: ym key (e.g. "11409")
            shares,              // 1: 拆解張數
            Number(row[3]) || 0, // 2: 成交筆數
            Number(row[4]) || 0, // 3: 最低權利金
            Number(row[5]) || 0, // 4: 最高權利金
            avg,                 // 5: 平均權利金
            Number(row[7]) || 0, // 6: 契約期間
            premium              // 7: 權利金萬元
        ]);
    }
}

// Sort each CB's records by month
for (const digit of Object.keys(chunks)) {
    for (const code of Object.keys(chunks[digit])) {
        chunks[digit][code].sort((a, b) => a[0].localeCompare(b[0]));
    }
}

// Write index file (tiny, loaded on page load)
const indexStr = JSON.stringify({ names });
fs.writeFileSync('cbas_index.json', indexStr);
console.log(`cbas_index.json: ${(indexStr.length / 1024).toFixed(1)} KB`);

// Write chunk files (loaded on demand when user searches)
for (const [digit, chunkData] of Object.entries(chunks)) {
    const chunkStr = JSON.stringify(chunkData);
    const fn = `cbas_chunk_${digit}.json`;
    fs.writeFileSync(fn, chunkStr);
    const codeCount = Object.keys(chunkData).length;
    console.log(`${fn}: ${(chunkStr.length / 1024).toFixed(1)} KB, ${codeCount} codes`);
}

console.log('Done!');
