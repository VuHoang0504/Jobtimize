const { executeQuery } = require('../src/config/db');

(async () => {
  try {
    await executeQuery(`
      IF COL_LENGTH('CVs', 'CvType') IS NULL
          ALTER TABLE CVs ADD CvType NVARCHAR(20) DEFAULT 'Upload' WITH VALUES;
      IF COL_LENGTH('CVs', 'CvData') IS NULL
          ALTER TABLE CVs ADD CvData NVARCHAR(MAX) NULL;
      IF COL_LENGTH('CVs', 'Template') IS NULL
          ALTER TABLE CVs ADD Template NVARCHAR(50) DEFAULT 'modern' WITH VALUES;
      IF COL_LENGTH('CVs', 'UpdatedAt') IS NULL
          ALTER TABLE CVs ADD UpdatedAt DATETIME DEFAULT GETDATE() WITH VALUES;

      DECLARE @fkName NVARCHAR(256);
      SELECT @fkName = fk.name
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
      WHERE fk.parent_object_id = OBJECT_ID('JobApplications') AND c.name = 'CVID';

      IF @fkName IS NOT NULL
          EXEC('ALTER TABLE JobApplications DROP CONSTRAINT [' + @fkName + ']');
    `);

    console.log('✅ CVs table & JobApplications.CVID constraint updated successfully so CVs can always be deleted!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
})();
