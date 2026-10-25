const path = require('path');
const { executeQuery } = require('../src/config/db');

async function migrate() {
  try {
    console.log('Running payOS database migration...');

    // 1. Add OrderCode to PaymentTransactions if not exists
    await executeQuery(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PaymentTransactions') AND name = 'OrderCode')
      BEGIN
        ALTER TABLE PaymentTransactions ADD OrderCode BIGINT NULL;
      END
    `);
    console.log('Checked OrderCode column.');

    // 2. Add PaymentLinkId to PaymentTransactions if not exists
    await executeQuery(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PaymentTransactions') AND name = 'PaymentLinkId')
      BEGIN
        ALTER TABLE PaymentTransactions ADD PaymentLinkId NVARCHAR(255) NULL;
      END
    `);
    console.log('Checked PaymentLinkId column.');

    // 3. Add CheckoutUrl to PaymentTransactions if not exists
    await executeQuery(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PaymentTransactions') AND name = 'CheckoutUrl')
      BEGIN
        ALTER TABLE PaymentTransactions ADD CheckoutUrl NVARCHAR(1000) NULL;
      END
    `);
    console.log('Checked CheckoutUrl column.');

    // 4. Add QrCode to PaymentTransactions if not exists
    await executeQuery(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PaymentTransactions') AND name = 'QrCode')
      BEGIN
        ALTER TABLE PaymentTransactions ADD QrCode NVARCHAR(MAX) NULL;
      END
    `);
    console.log('Checked QrCode column.');

    // 5. Create index on OrderCode if not exists
    await executeQuery(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PaymentTransactions_OrderCode' AND object_id = OBJECT_ID('PaymentTransactions'))
      BEGIN
        EXEC('CREATE NONCLUSTERED INDEX IX_PaymentTransactions_OrderCode ON PaymentTransactions(OrderCode) WHERE OrderCode IS NOT NULL');
      END
    `);
    console.log('Checked index IX_PaymentTransactions_OrderCode.');

    const cols = await executeQuery("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PaymentTransactions'");
    console.log('Current PaymentTransactions columns:', cols.recordset.map(c => `${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

