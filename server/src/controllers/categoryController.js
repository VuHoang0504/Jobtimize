const { executeQuery } = require('../config/db');

// Get all job categories
const getCategories = async (req, res) => {
  try {
    const result = await executeQuery('SELECT CategoryID, CategoryName, Description FROM JobCategories ORDER BY CategoryName ASC');
    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('getCategories error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get skill taxonomy
const getSkills = async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT st.SkillID, st.SkillName, st.NormalizedName, st.CategoryID, jc.CategoryName
      FROM SkillTaxonomy st
      LEFT JOIN JobCategories jc ON st.CategoryID = jc.CategoryID
      ORDER BY st.SkillName ASC
    `);
    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('getSkills error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCategories,
  getSkills
};
