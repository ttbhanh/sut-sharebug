const fs = require("fs");
const path = require("path");
const TestCaseTestRuns = require("../models/testCaseTestRunModel");

// Đường dẫn đến file JSON chứa dữ liệu mẫu
const TestCaseTestRunsDataPath = path.join(
  __dirname,
  "..",
  "data",
  "testCaseTestRuns.json"
);

async function seedTestCaseTestRuns() {
  try {
    // Đọc dữ liệu từ file JSON
    const rawData = fs.readFileSync(TestCaseTestRunsDataPath);
    const TestCaseTestRunsData = JSON.parse(rawData);

    await TestCaseTestRuns.deleteMany({});
    await TestCaseTestRuns.insertMany(TestCaseTestRunsData);

    console.log(
      'Dữ liệu mẫu cho bảng "TestCaseTestRuns" đã được tạo thành công.'
    );
  } catch (error) {
    console.error(
      'Lỗi khi tạo dữ liệu mẫu cho bảng "TestCaseTestRuns":',
      error
    );
  }
}

module.exports = seedTestCaseTestRuns;
