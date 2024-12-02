// shared.js

function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  // Loại bỏ các ký tự nguy hiểm
  const sanitizedInput = input.replace(/[=\\'"/<>]/g, "");

  return sanitizedInput;
}

function formatDate(date) {
  return new Date(date).toISOString().split("T")[0];
}
function formatDate2(date) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };
  return new Date(date).toLocaleDateString("en-US", options);
}
function formatDate3(date) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(date).toLocaleDateString("en-US", options);
}

function formatTime(date) {
  return new Date(date).toISOString().split("T")[1].split(".")[0];
}

function truncateId(id, limit) {
  const strId = String(id);
  if (limit === 0 || limit >= strId.length) {
    return strId;
  } else {
    const halfLimit = Math.floor(limit / 2);
    const firstPart = strId.substring(0, halfLimit);
    const secondPart = strId.substring(strId.length - halfLimit);
    return firstPart + "..." + secondPart;
  }
}
function getInitials(name) {
  const nameParts = name.trim().split(" ");
  const initials = nameParts
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials.substring(0, 2);
}
module.exports = {
  sanitizeInput,
  formatTime,
  formatDate,
  formatDate2,
  formatDate3,
  truncateId,
  getInitials,
};
