// Chỉ chạy file này 1 lần duy nhất lúc tạo dữ liệu mẫu
// Cấm chạy lại file này, chạy là ăn shit

const connectDB = require("./connectDB");

const seedUsers = require("./seeders/userSeeder");
const seedProjects = require("./seeders/projectSeeder");
const seedParticipations = require("./seeders/participationSeeder");
const seedReports = require("./seeders/reportSeeder");
const seedModules = require("./seeders/moduleSeeder");
const seedActivities = require("./seeders/activitySeeder");
const seedReleases = require("./seeders/releaseSeeder");
const seedRequirements = require("./seeders/requirementSeeder");
const seedTestPlans = require("./seeders/testPlanSeeder");
const seedTestCases = require("./seeders/testCaseSeeder");
const seedTags = require("./seeders/tagSeeder");
const seedTestRuns = require("./seeders/testRunSeeder");
const seedTestCaseTestRuns = require("./seeders/testCaseTestRunSeeder");
const seedIssues = require("./seeders/issueSeeder");

connectDB();

seedUsers();
seedProjects();
seedParticipations();
seedReports();
seedModules();
seedActivities();
seedReleases();
seedRequirements();
seedTestPlans();
seedTestCases();
seedTags();
seedTestRuns();
seedTestCaseTestRuns();
seedIssues();
