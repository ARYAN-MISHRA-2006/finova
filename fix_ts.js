const fs = require('fs');

// Fix oracle.ts
let oracleCode = fs.readFileSync('src/domain/oracle.ts', 'utf8');
oracleCode = oracleCode.replace(
  /const result = \{[\s\S]*?status: 'RESPONDING' as const[\s\S]*?\};/,
  `const result: OracleReading = {
    sourceId: reading.sourceId || 'UNKNOWN',
    value: reading.value !== undefined ? reading.value : null,
    unit: reading.unit || 'mm',
    timestamp: reading.timestamp || 0,
    receivedAt: currentTime,
    status: 'RESPONDING'
  };`
);
fs.writeFileSync('src/domain/oracle.ts', oracleCode);

// Fix page.tsx
let pageCode = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');
pageCode = pageCode.replace(/insuranceView === 'BINDING_PLACEHOLDER'/g, "insuranceView as any === 'BINDING_PLACEHOLDER'"); // Or just remove the condition altogether since we don't use it anymore
// actually let's just change it to 'BINDING_REVIEW'
pageCode = pageCode.replace(/insuranceView === 'BINDING_PLACEHOLDER'/g, "insuranceView === 'BINDING_REVIEW'");
fs.writeFileSync('src/app/farmer/page.tsx', pageCode);

