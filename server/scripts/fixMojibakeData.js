/**
 * Sửa dữ liệu bị lỗi font (mojibake, ví dụ "GÃ³i Khá»Ÿi Nghiá»‡p") và gộp các bản ghi trùng lặp
 * trong SubscriptionPackages / JobCategories, đồng thời đảm bảo bảng PaymentTransactions tồn tại.
 *
 * Chạy thử (chỉ xem, không ghi):  node scripts/fixMojibakeData.js
 * Áp dụng thay đổi:              node scripts/fixMojibakeData.js --apply
 */
const { executeQuery } = require('../src/config/db');

const APPLY = process.argv.includes('--apply');

// Bảng ngược Windows-1252 cho dải 0x80-0x9F
const CP1252 = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91,
  0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98,
  0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
};

// Trả về chuỗi đã sửa, hoặc null nếu chuỗi không bị lỗi mojibake
function repair(str) {
  if (typeof str !== 'string' || !/[\u0080-\u00FF]/.test(str)) return null;
  const bytes = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp < 0x100) bytes.push(cp);
    else if (CP1252[cp] !== undefined) bytes.push(CP1252[cp]);
    else return null; // có ký tự Unicode thật (vd: "ệ") => chuỗi đúng, không sửa
  }
  const fixed = Buffer.from(bytes).toString('utf8');
  if (fixed.includes('\uFFFD') || fixed === str) return null;
  return fixed;
}

const TEXT_COLUMNS = {
  SubscriptionPackages: ['PackageID', ['PackageName']],
  JobCategories: ['CategoryID', ['CategoryName', 'Description']],
  Employers: ['EmployerID', ['CompanyName', 'CompanySize', 'Address', 'Description']],
  JobPostings: ['JobID', ['Title', 'Description', 'Requirements', 'SalaryRange', 'Location']],
  Users: ['UserID', ['FullName']],
  Courses: ['CourseID', ['Title']],
};

async function fixText() {
  let total = 0;
  for (const [table, [idCol, cols]] of Object.entries(TEXT_COLUMNS)) {
    const rows = (await executeQuery(`SELECT ${idCol} AS id, ${cols.join(', ')} FROM ${table}`)).recordset;
    for (const row of rows) {
      const updates = {};
      for (const col of cols) {
        const fixed = repair(row[col]);
        if (fixed !== null) updates[col] = fixed;
      }
      if (Object.keys(updates).length === 0) continue;
      total++;
      console.log(`  [${table} #${row.id}] ${Object.entries(updates).map(([c, v]) => `${c} → "${v.slice(0, 60)}"`).join(' | ')}`);
      if (APPLY) {
        const setSql = Object.keys(updates).map(c => `${c} = @${c}`).join(', ');
        await executeQuery(`UPDATE ${table} SET ${setSql} WHERE ${idCol} = @id`, { ...updates, id: row.id });
      }
    }
  }
  return total;
}

// Gộp bản ghi trùng tên: giữ ID nhỏ nhất, chuyển các khóa ngoại sang ID đó rồi xóa bản trùng
async function mergeDuplicates(table, idCol, nameCol, fkRefs) {
  const dups = (await executeQuery(`
    SELECT t.${idCol} AS dupId, k.keepId, t.${nameCol} AS name
    FROM ${table} t
    JOIN (SELECT ${nameCol} AS n, MIN(${idCol}) AS keepId FROM ${table} GROUP BY ${nameCol}) k ON t.${nameCol} = k.n
    WHERE t.${idCol} <> k.keepId`)).recordset;

  for (const d of dups) {
    console.log(`  [${table}] gộp #${d.dupId} → #${d.keepId} (${d.name})`);
    if (!APPLY) continue;
    for (const [fkTable, fkCol] of fkRefs) {
      await executeQuery(
        `IF OBJECT_ID(N'${fkTable}') IS NOT NULL UPDATE ${fkTable} SET ${fkCol} = @keepId WHERE ${fkCol} = @dupId`,
        { keepId: d.keepId, dupId: d.dupId }
      );
    }
    await executeQuery(`DELETE FROM ${table} WHERE ${idCol} = @dupId`, { dupId: d.dupId });
  }
  return dups.length;
}

async function ensurePaymentTransactions() {
  const exists = (await executeQuery(`SELECT COUNT(*) AS n FROM sys.tables WHERE name = 'PaymentTransactions'`)).recordset[0].n;
  console.log(`  PaymentTransactions: ${exists ? 'đã tồn tại' : 'CHƯA có → sẽ tạo'}`);
  if (exists || !APPLY) return;
  await executeQuery(`
    CREATE TABLE PaymentTransactions (
      PaymentID INT IDENTITY(1,1) PRIMARY KEY,
      TransactionRef NVARCHAR(100) NOT NULL UNIQUE,
      EmployerID INT NOT NULL FOREIGN KEY REFERENCES Employers(EmployerID) ON DELETE CASCADE,
      PackageID INT NOT NULL FOREIGN KEY REFERENCES SubscriptionPackages(PackageID),
      Amount DECIMAL(18,2) NOT NULL,
      Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
      PaymentMethod NVARCHAR(50) NULL,
      GatewayTransactionNo NVARCHAR(100) NULL,
      CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
      PaidAt DATETIME NULL
    )`);
}

(async () => {
  try {
    console.log(APPLY ? '🔧 CHẾ ĐỘ ÁP DỤNG' : '👀 CHẾ ĐỘ XEM TRƯỚC (thêm --apply để ghi thay đổi)');

    console.log('\n1) Bảng PaymentTransactions');
    await ensurePaymentTransactions();

    console.log('\n2) Sửa chuỗi bị lỗi font');
    const fixedRows = await fixText();

    console.log('\n3) Gộp bản ghi trùng lặp');
    const mergedPkgs = await mergeDuplicates('SubscriptionPackages', 'PackageID', 'PackageName', [
      ['EmployerSubscriptions', 'PackageID'],
      ['PaymentTransactions', 'PackageID'],
    ]);
    const mergedCats = await mergeDuplicates('JobCategories', 'CategoryID', 'CategoryName', [
      ['JobPostings', 'CategoryID'],
      ['SkillTaxonomy', 'CategoryID'],
    ]);

    console.log(`\nTổng kết: ${fixedRows} dòng lỗi font, ${mergedPkgs} gói trùng, ${mergedCats} ngành nghề trùng.`);
    if (APPLY) {
      const pk = await executeQuery('SELECT PackageID, PackageName, Price, DurationDays, PostLimit, SearchLimit FROM SubscriptionPackages ORDER BY Price');
      console.log('\nGói dịch vụ sau khi sửa:');
      console.table(pk.recordset);
    }
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  }
  process.exit(0);
})();

